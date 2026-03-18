/**
 * x402 Agent Client — Headless x402 Payment Handler
 * 
 * Signs STX transfers with a private key instead of prompting a wallet popup.
 * Designed for autonomous agent/bot usage — no UI required.
 * 
 * Uses @stacks/transactions directly to build, sign, and broadcast transactions.
 */

import {
  makeSTXTokenTransfer,
  makeContractCall,
  broadcastTransaction,
  PostConditionMode,
  Cl,
  Pc,
} from '@stacks/transactions';
import { TOKEN_CONTRACTS } from '../lib/tokenContracts';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

export interface AgentPaymentRequired {
  version: string;
  payTo: string;
  amountSTX: number;
  amountUSDCx: number;
  amountSBTC: number;
  resource: string;
  description: string;
  tokenTypes: string[];
  network: string;
  nonce: string;
  expiresAt: string;
}

export type AgentTokenType = 'STX' | 'USDCx' | 'sBTC';

export interface AgentConfig {
  backendUrl: string;
  senderKey: string;        // Private key (hex) — NEVER expose publicly
  senderAddress: string;    // Corresponding STX address
  authToken: string;        // JWT from backend auth
  tokenType: AgentTokenType;
  network: 'mainnet' | 'testnet';
  // Contract addresses for SIP-010 tokens
  usdcxContractAddress?: string;
  usdcxContractName?: string;
  sbtcContractAddress?: string;
  sbtcContractName?: string;
}

/**
 * Headless x402 fetch — detects 402, pays autonomously, retries.
 * No wallet popup — signs with the agent's private key.
 */
export async function agentX402Fetch(
  url: string,
  init: RequestInit,
  config: AgentConfig
): Promise<Response> {
  const networkObj = config.network === 'mainnet' 
    ? STACKS_MAINNET 
    : { ...STACKS_TESTNET, coreApiUrl: 'https://api.testnet.hiro.so' };

  const broadcastUrl = config.network === 'mainnet'
    ? 'https://stacks-node-api.mainnet.stacks.co'
    : 'https://api.testnet.hiro.so';
  void broadcastUrl; // retained for potential future use — not used by broadcastTransaction()

  // Step 1 — Make the initial request
  console.log(`[Agent] → ${init.method || 'GET'} ${url}`);
  let response = await fetch(url, init);

  // Step 2 — If not 402, return immediately
  if (response.status !== 402) {
    return response;
  }

  // Step 3 — Decode the 402 payment challenge
  const paymentRequiredB64 = response.headers.get('payment-required');
  if (!paymentRequiredB64) {
    throw new Error('[Agent] 402 without payment-required header');
  }

  const challenge: AgentPaymentRequired = JSON.parse(atob(paymentRequiredB64));
  console.log(`[Agent] 💰 Payment Required: ${challenge.description}`);
  console.log(`[Agent]    payTo: ${challenge.payTo}`);
  console.log(`[Agent]    STX: ${challenge.amountSTX}, USDCx: ${challenge.amountUSDCx}, sBTC: ${challenge.amountSBTC}`);

  // Step 4 — Build, sign, and broadcast the transaction
  let txId: string;

  if (config.tokenType === 'STX') {
    console.log(`[Agent] Signing STX transfer: ${challenge.amountSTX} µSTX → ${challenge.payTo}`);
    const tx = await makeSTXTokenTransfer({
      recipient: challenge.payTo,
      amount: BigInt(challenge.amountSTX),
      senderKey: config.senderKey,
      memo: `x402:${challenge.nonce.substring(0, 8)}`,
      network: networkObj,
    });

    const result = await broadcastTransaction({ transaction: tx, network: networkObj });
    if ('error' in result) {
      throw new Error(`[Agent] Broadcast failed: ${JSON.stringify(result)}`);
    }
    txId = typeof result === 'string' ? result : result.txid;

  } else if (config.tokenType === 'sBTC' || config.tokenType === 'USDCx') {
    const contract = TOKEN_CONTRACTS[config.tokenType][config.network];
    const amount = config.tokenType === 'sBTC' ? challenge.amountSBTC : challenge.amountUSDCx;

    console.log(`[Agent] Signing ${config.tokenType} transfer: ${amount} → ${challenge.payTo}`);
    const tx = await makeContractCall({
      contractAddress: contract.address,
      contractName: contract.name,
      functionName: 'transfer',
      functionArgs: [
        Cl.uint(amount),
        Cl.principal(config.senderAddress),
        Cl.principal(challenge.payTo),
        Cl.none(),
      ],
      senderKey: config.senderKey,
      network: networkObj,
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        Pc.principal(config.senderAddress).willSendEq(amount).ft(`${contract.address}.${contract.name}`, contract.tokenDefinedName),
      ],
    });

    const result = await broadcastTransaction({ transaction: tx, network: networkObj });
    if ('error' in result) {
      throw new Error(`[Agent] Broadcast failed: ${JSON.stringify(result)}`);
    }
    txId = typeof result === 'string' ? result : result.txid;
  } else {
    throw new Error(`[Agent] Unsupported token type: ${config.tokenType}`);
  }

  console.log(`[Agent] ✅ Transaction broadcast: ${txId}`);

  // Step 5 — Build signature payload and retry
  const sigPayload = btoa(JSON.stringify({
    txId,
    senderAddress: config.senderAddress,
    nonce: challenge.nonce,
    tokenType: config.tokenType,
  }));

  const retryInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      'payment-signature': sigPayload,
      'X-PAYMENT-TOKEN-TYPE': config.tokenType,
    },
  };

  console.log(`[Agent] Retrying with payment signature...`);
  const retryResponse = await fetch(url, retryInit);
  console.log(`[Agent] → ${retryResponse.status} ${retryResponse.statusText}`);

  return retryResponse;
}
