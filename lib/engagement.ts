// lib/engagement.ts
// Lightweight fire-and-forget engagement tracker for authenticated users.
//
// Usage:
//   trackEvent('ecosystem.outbound', { entityType: 'link', entityId: 'swap', ... });
//   No await needed — fire and forget, never blocks UI.

import { getAccessToken, getStoredUser } from './walletAuth';

const ENGAGEMENT_URL =
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '') +
    '/engagement/track/';

let sessionId: string | null = null;

function getSessionId(): string {
    if (!sessionId) {
        sessionId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    }
    return sessionId;
}

export function trackEvent(
    action: string,
    data?: {
        entityType?: string;
        entityId?: string;
        partnerSlug?: string;
        surface?: string;
        destinationUrl?: string;
        metadata?: Record<string, unknown>;
    }
): void {
    const accessToken = getAccessToken();
    if (!accessToken) return;

    const user = getStoredUser();
    if (user?.tracking_opted_out) return;

    try {
        fetch(ENGAGEMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                action,
                entity_type: data?.entityType,
                entity_id: data?.entityId,
                partner_slug: data?.partnerSlug,
                surface: data?.surface,
                source_url: window.location.pathname,
                destination_url: data?.destinationUrl,
                session_id: getSessionId(),
                metadata: data?.metadata ?? {},
            }),
        });
        // No await — fire and forget, never block UI
    } catch {
        // Silently fail — engagement tracking should never break the app
    }
}
