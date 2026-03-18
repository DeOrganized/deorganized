/**
 * Agent operation: Upgrade/buy a platform subscription using x402 payment.
 *
 * Once the subscription is active, the agent can call /ops/ endpoints
 * (create-folder, upload, stream-start, etc.).
 *
 * Usage:
 *   const res = await agentUpgradeSubscription('pro', config);
 */
import { agentX402Fetch, AgentConfig } from '../x402AgentClient';

export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise';

export async function agentUpgradeSubscription(
  plan: SubscriptionPlan,
  config: AgentConfig
): Promise<Response> {
  const url = `${config.backendUrl}/api/subscriptions/upgrade/`;
  return agentX402Fetch(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan }),
    },
    config
  );
}

/**
 * Convenience: fetch the agent's current DAPP points balance.
 * Points are automatically awarded after every successful x402 payment.
 */
export async function agentGetDappPoints(config: AgentConfig): Promise<{
  total: number;
  wallet_verified: boolean;
  stacks_address: string;
  history: Array<{
    action: string;
    points: number;
    tx_id: string;
    description: string;
    created_at: string;
  }>;
}> {
  const res = await fetch(`${config.backendUrl}/api/users/points/`, {
    headers: { Authorization: `Bearer ${config.authToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch DAPP points: ${res.status}`);
  return res.json();
}
