import { 
  openSTXTransfer, 
  openContractCall 
} from '@stacks/connect';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { 
  PostConditionMode, 
  Cl,
  Pc,
} from '@stacks/transactions';
import { TOKEN_CONTRACTS, PaymentToken } from './tokenContracts';

// PaymentToken imported from ./tokenContracts

export interface X402PaymentOptions {
  tokenType: PaymentToken;
  payTo: string;            // recipient STX address
  amountSTX: number;        // microSTX
  amountUSDCx: number;      // smallest USDCx unit
  amountSBTC: number;       // satoshis
  resourceDescription: string;
  senderAddress: string;    // from connected wallet session
}

export interface PaymentRequired {
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

export class PaymentCancelledError extends Error {
  constructor() {
    super("Payment was cancelled by the user");
    this.name = "PaymentCancelledError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentFailedError";
  }
}

export class InsufficientBalanceError extends Error {
  have: number;
  need: number;
  token: PaymentToken;
  constructor(token: PaymentToken, have: number, need: number) {
    const labels: Record<PaymentToken, string> = { STX: 'STX', USDCx: 'USDCx', sBTC: 'sBTC' };
    const divisor = token === 'STX' ? 1_000_000 : token === 'sBTC' ? 100_000_000 : 1_000_000;
    super(
      `Insufficient ${labels[token]} balance. Have: ${(have / divisor).toFixed(token === 'sBTC' ? 8 : 2)}, Need: ${(need / divisor).toFixed(token === 'sBTC' ? 8 : 2)}`
    );
    this.name = "InsufficientBalanceError";
    this.have = have;
    this.need = need;
    this.token = token;
  }
}

// Balance checks removed - wallet handles this natively

/**
 * Custom fetch wrapper that handles x402 v2 payment-required loop.
 * Supports STX, USDCx, and sBTC payments with optional balance pre-check.
 */
export async function x402Fetch(
  url: string,
  init?: RequestInit,
  options?: Partial<X402PaymentOptions>
): Promise<{ response: Response; txId?: string; receiptToken?: string }> {
  
  const getStoredAddress = () => {
    if (typeof window === 'undefined') return '';
    // 1. Try our application-level user storage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u.stacks_address) return u.stacks_address;
      } catch {}
    }
    // 2. Fallback to Stacks Connect's self-storage
    const stacksData = localStorage.getItem('blockstack-session');
    if (stacksData) {
      try {
        const s = JSON.parse(stacksData);
        const address = s?.userData?.profile?.stxAddress?.testnet || s?.userData?.profile?.stxAddress?.mainnet;
        if (address) return address;
      } catch {}
    }
    return '';
  };
  
  // 1. Make the initial request
  let response = await fetch(url, init);

  // 2. Handle non-ok and non-402 responses (e.g., 401 Unauthorized)
  if (!response.ok && response.status !== 402) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || errorData.error || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    (error as any).response = response;
    throw error;
  }

  // 3. Short circuit if already OK (already paid or no gate)
  if (response.ok) {
    return { response, txId: undefined };
  }

  // 3. Handle 402 - Payment Required
  const paymentRequiredB64 = response.headers.get('payment-required');
  if (!paymentRequiredB64) {
    return { response }; // Plain 402 without x402 headers
  }

  const paymentRequired: PaymentRequired = JSON.parse(atob(paymentRequiredB64));
  
  // Determine token type: use explicit option, else pick first available
  const tokenType = options?.tokenType || (paymentRequired.amountUSDCx > 0 ? "USDCx" : "STX");
  const networkStr = paymentRequired.network === 'mainnet' ? 'mainnet' : 'testnet';
  const network = networkStr === 'mainnet' 
    ? STACKS_MAINNET 
    : { 
        ...STACKS_TESTNET, 
        coreApiUrl: 'https://api.testnet.hiro.so', // Compat for older SDKs
        client: { baseUrl: 'https://api.testnet.hiro.so' }  // Standard for newer SDKs
      };

  const senderAddr = options?.senderAddress || getStoredAddress();

  console.log(`[x402] Payment Required: ${paymentRequired.description} (${tokenType})`);

  // 4. Removed Balance pre-check logic (Wallet handles it natively)

  // Will hold either txId (for STX) or txRaw (for contract calls)
  let txIdentifier: string;

  try {
    if (tokenType === "STX") {
      if (!senderAddr) {
        throw new PaymentFailedError("Wallet session not found. Please reconnect your wallet.");
      }
      if (!paymentRequired.payTo) {
        throw new PaymentFailedError("Invalid payment request: Missing recipient address.");
      }

      txIdentifier = await new Promise((resolve, reject) => {
        openSTXTransfer({
          recipient: paymentRequired.payTo,
          amount: paymentRequired.amountSTX.toString(),
          memo: `x402:${paymentRequired.nonce.substring(0, 8)}`,
          network,
          onFinish: (data) => resolve(data.txId),
          onCancel: () => reject(new PaymentCancelledError()),
        });
      });

    } else if (tokenType === "sBTC" || tokenType === "USDCx") {
      // SIP-010 Transfer (sBTC or USDCx)
      const contract = TOKEN_CONTRACTS[tokenType][networkStr];
      const amount = tokenType === "sBTC" ? paymentRequired.amountSBTC : paymentRequired.amountUSDCx;

      if (!senderAddr) {
        throw new PaymentFailedError("Wallet session not found. Please reconnect your wallet.");
      }
      if (!paymentRequired.payTo) {
        throw new PaymentFailedError("Invalid payment request: Missing recipient address.");
      }

      txIdentifier = await new Promise((resolve, reject) => {
        openContractCall({
          contractAddress: contract.address,
          contractName: contract.name,
          functionName: 'transfer',
          functionArgs: [
            Cl.uint(amount),
            Cl.principal(senderAddr),
            Cl.principal(paymentRequired.payTo),
            Cl.none(), // memo
          ],
          postConditionMode: PostConditionMode.Deny,
          postConditions: [
            Pc.principal(senderAddr).willSendEq(amount).ft(`${contract.address}.${contract.name}`, contract.tokenDefinedName),
          ],
          network,
          onFinish: (data) => resolve(data.txId),
          onCancel: () => reject(new PaymentCancelledError()),
        });
      });
    }
  } catch (err) {
    if (err instanceof PaymentCancelledError) throw err;
    if (err instanceof InsufficientBalanceError) throw err;
    throw new PaymentFailedError(`Wallet interaction failed: ${err}`);
  }

  // 5. Build payment-signature payload with txId
  const sigPayload = btoa(JSON.stringify({
    txId: txIdentifier,
    senderAddress: senderAddr,
    nonce: paymentRequired.nonce,
    tokenType: tokenType,
  }));

  // 6. Retry the original request with payment headers
  const retryInit = {
    ...init,
    headers: {
      ...init?.headers,
      'payment-signature': sigPayload,
      'X-PAYMENT-TOKEN-TYPE': tokenType,
    }
  };

  const retryResponse = await fetch(url, retryInit);
  const receiptToken = retryResponse.headers.get('payment-response') || undefined;

  return { response: retryResponse, txId: txIdentifier, receiptToken };
}
