// ============================================
// DEFERRED WALLET AUTHENTICATION API
// ============================================
// NOTE: This implementation does NOT verify wallet signatures
// Suitable for MVP/testing only - requires signature verification for production

// Environment-aware API URL (same as api.ts)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ============================================
// Type Definitions
// ============================================

export interface User {
    id: number;
    username: string;
    stacks_address: string;
    role: 'user' | 'creator';
    bio?: string;
    website?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    profile_picture?: string;
    cover_photo?: string;
    is_verified: boolean;
    is_staff?: boolean;
    date_joined: string;
    follower_count?: number;
    following_count?: number;
    tracking_opted_out?: boolean;
}

export interface Tokens {
    access: string;
    refresh: string;
}

export interface WalletCheckResponse {
    is_new: boolean;
    user?: User;
    tokens?: Tokens;
}

export interface CompleteSetupPayload {
    wallet_address: string;
    username?: string;
    role: 'user' | 'creator';
    bio?: string;
    website?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    stacks_signature?: string;
    stacks_message?: string;
}

export interface CompleteSetupResponse {
    user: User;
    tokens: Tokens;
}

// ============================================
// API Functions
// ============================================

/**
 * Check if wallet exists and login if it does.
 * Returns is_new=true if wallet doesn't exist (new user).
 * Returns is_new=false + JWT tokens if wallet exists (existing user).
 * 
 * @param walletAddress - Stacks wallet address (SP... or SM...)
 * @returns WalletCheckResponse with is_new flag and optional user/tokens
 */
export async function checkWalletOrLogin(
    walletAddress: string,
    message?: string,
    signature?: string,
): Promise<WalletCheckResponse> {
    try {
        const body: Record<string, string> = { wallet_address: walletAddress };
        if (message)   body.message   = message;
        if (signature) body.signature = signature;

        const response = await fetch(`${API_BASE_URL}/users/wallet-login-or-check/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || error.error || 'Wallet check failed');
        }

        const data: WalletCheckResponse = await response.json();

        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Complete user setup and create account.
 * Called after user fills setup form.
 * 
 * @param payload - User profile data including wallet address
 * @returns User object and JWT tokens
 */
export async function completeSetup(
    payload: CompleteSetupPayload
): Promise<CompleteSetupResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/users/complete-setup/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || error.error || 'Setup failed');
        }

        const data: CompleteSetupResponse = await response.json();

        return data;
    } catch (error) {
        throw error;
    }
}

// ============================================
// Token Management
// ============================================

/**
 * Store JWT tokens in localStorage
 */
export function storeTokens(tokens: Tokens): void {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
    return localStorage.getItem('access_token');
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
}

/**
 * Store user data in localStorage
 */
export function storeUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Get stored user data
 */
export function getStoredUser(): User | null {
    const userData = localStorage.getItem('user');
    if (!userData) return null;

    try {
        return JSON.parse(userData);
    } catch (error) {
        return null;
    }
}

/**
 * Clear all stored authentication data (logout)
 */
export function clearAuth(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('signedMessage');
    localStorage.removeItem('signedMessageText');
    sessionStorage.removeItem('pending_wallet_address');
}

/**
 * Persist the wallet address + signature pair that proved ownership.
 * Stored so subsequent sessions can attempt silent re-authentication
 * without prompting the wallet again.
 */
export function storeWalletCredentials(address: string, message: string, signature: string): void {
    localStorage.setItem('userAddress', address);
    localStorage.setItem('signedMessage', signature);
    localStorage.setItem('signedMessageText', message);
}

/**
 * Retrieve persisted wallet credentials, or null if any are missing.
 */
export function getWalletCredentials(): { userAddress: string; signedMessage: string; signedMessageText: string } | null {
    const userAddress      = localStorage.getItem('userAddress');
    const signedMessage    = localStorage.getItem('signedMessage');
    const signedMessageText = localStorage.getItem('signedMessageText');
    if (!userAddress || !signedMessage || !signedMessageText) return null;
    return { userAddress, signedMessage, signedMessageText };
}

/**
 * Check if user is authenticated (has valid tokens)
 */
export function isAuthenticated(): boolean {
    const token = getAccessToken();
    return !!token;
}

// ============================================
// Token Refresh & Validation
// ============================================

/**
 * Decode a JWT payload without verification (just reads the expiry).
 * Returns null if the token is malformed.
 */
function decodeTokenPayload(token: string): { exp: number;[key: string]: any } | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Check if a JWT token is expired based on its exp claim.
 * Adds a 30-second buffer so we refresh slightly before actual expiry.
 */
export function isTokenExpired(token: string): boolean {
    const payload = decodeTokenPayload(token);
    if (!payload?.exp) return true;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds + 30; // 30s buffer
}

/**
 * Refresh the access token using the stored refresh token.
 * Calls POST /api/auth/token/refresh/ on the backend.
 * Returns new tokens on success, or null if the refresh token is also expired.
 */
export async function refreshAccessToken(): Promise<Tokens | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        console.warn('⚠️ [AUTH] No refresh token found');
        return null;
    }

    // Quick client-side check: if refresh token itself is expired, don't bother calling API
    if (isTokenExpired(refreshToken)) {
        console.warn('⚠️ [AUTH] Refresh token is expired — session ended');
        return null;
    }

    try {
        console.log('🔄 [AUTH] Refreshing access token...');
        const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            console.warn('⚠️ [AUTH] Token refresh failed:', response.status);
            return null;
        }

        const data = await response.json();
        // SimpleJWT returns { access: '...' } and optionally { refresh: '...' } if ROTATE_REFRESH_TOKENS is true
        const newTokens: Tokens = {
            access: data.access,
            refresh: data.refresh || refreshToken, // Use new refresh if rotated, else keep old
        };

        storeTokens(newTokens);
        console.log('✅ [AUTH] Access token refreshed successfully');
        return newTokens;
    } catch (error) {
        console.error('❌ [AUTH] Token refresh error:', error);
        return null;
    }
}

/**
 * Get a valid access token, refreshing if needed.
 * Returns null and clears auth if the session is fully expired.
 * Use this instead of getAccessToken() for API calls.
 */
export async function getValidAccessToken(): Promise<string | null> {
    const accessToken = getAccessToken();

    // No token at all
    if (!accessToken) return null;

    // Token still valid
    if (!isTokenExpired(accessToken)) return accessToken;

    // Token expired — try to refresh
    const newTokens = await refreshAccessToken();
    if (newTokens) return newTokens.access;

    // Refresh also failed — session is fully expired
    console.warn('⚠️ [AUTH] Session fully expired — clearing auth');
    clearAuth();
    return null;
}

// ============================================
// Temporary Storage (for setup flow)
// ============================================

/**
 * Store wallet address temporarily during setup flow
 */
export function storePendingWallet(walletAddress: string): void {
    sessionStorage.setItem('pending_wallet_address', walletAddress);
}

/**
 * Get pending wallet address from temporary storage
 */
export function getPendingWallet(): string | null {
    return sessionStorage.getItem('pending_wallet_address');
}

/**
 * Clear pending wallet address
 */
export function clearPendingWallet(): void {
    sessionStorage.removeItem('pending_wallet_address');
}
