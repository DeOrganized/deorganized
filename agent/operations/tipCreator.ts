/**
 * Agent operation: Tip a creator using x402 payment (STX, USDCx, or sBTC).
 *
 * The agent uses agentX402Fetch which handles the full 402 → sign → retry loop
 * headlessly using a private key. No wallet popup is shown.
 *
 * Usage:
 *   const res = await agentTipCreator(creatorId, { usdcx: 1_000_000 }, config);
 *   // creatorId: Django user ID of the creator
 *   // amounts: micro-units (1 STX = 1_000_000 microSTX, 1 USDCx = 1_000_000)
 */
import { agentX402Fetch, AgentConfig } from '../x402AgentClient';

export async function agentTipCreator(
  creatorId: number,
  amounts: { stx?: number; usdcx?: number; sbtc?: number },
  config: AgentConfig
): Promise<Response> {
  const url = `${config.backendUrl}/api/tips/${creatorId}/send/`;
  return agentX402Fetch(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount_stx:   amounts.stx   ?? 0,
        amount_usdcx: amounts.usdcx ?? 0,
        amount_sbtc:  amounts.sbtc  ?? 0,
      }),
    },
    config
  );
}
