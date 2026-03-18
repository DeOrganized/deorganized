/**
 * Agent operation: Purchase merch using x402 payment.
 *
 * The backend (OrderViewSet.create) will issue a 402 with the merch price.
 * agentX402Fetch signs and retries automatically.
 *
 * Usage:
 *   const res = await agentBuyMerch(merchId, '123 Fake St', config);
 */
import { agentX402Fetch, AgentConfig } from '../x402AgentClient';

export async function agentBuyMerch(
  merchId: number,
  shippingAddress: string,
  config: AgentConfig,
  buyerNote?: string
): Promise<Response> {
  const url = `${config.backendUrl}/api/orders/`;
  return agentX402Fetch(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merch: merchId,
        shipping_address: shippingAddress,
        buyer_note: buyerNote ?? '',
      }),
    },
    config
  );
}
