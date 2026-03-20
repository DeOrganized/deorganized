import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { request } from '@stacks/connect';
import { useStacksAuth } from './useStacksAuth';
import {
    checkWalletOrLogin,
    completeSetup,
    storeTokens,
    storeUser,
    clearAuth,
    getStoredUser,
    getAccessToken,
    getRefreshToken,
    storePendingWallet,
    isTokenExpired,
    refreshAccessToken,
    storeWalletCredentials,
    getWalletCredentials,
    User,
    CompleteSetupPayload
} from './walletAuth';

interface AuthContextType {
    // Wallet connection state
    isWalletConnected: boolean;
    walletAddress: string | null;
    bnsName: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;

    // Backend authentication state
    isBackendAuthenticated: boolean;
    backendUser: User | null;
    accessToken: string | null;

    // Loading and error states
    isAuthenticating: boolean;
    authError: string | null;

    // Actions
    handleWalletConnect: (onNewUser?: () => void, onExistingUser?: () => void) => Promise<void>;
    handleCompleteSetup: (payload: Omit<CompleteSetupPayload, 'wallet_address'>) => Promise<void>;
    refreshUser: () => Promise<void>;
    logout: () => void;
    clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const {
        isAuthenticated: isWalletConnected,
        userData,
        signIn,
        signOut
    } = useStacksAuth();

    const [backendUser, setBackendUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    /**
     * On mount: validate stored session.
     * If access token is expired, try to refresh it.
     * If refresh also fails, clear everything so the user sees "Connect Wallet".
     */
    useEffect(() => {
        const validateSession = async () => {
            const savedToken = getAccessToken();
            const savedUser = getStoredUser();

            // Nothing stored — attempt silent re-auth with persisted wallet credentials
            if (!savedToken || !savedUser) {
                const creds = getWalletCredentials();
                if (creds) {
                    console.log('🔵 [AUTH] No JWT found — attempting silent re-auth with stored credentials');
                    try {
                        const result = await checkWalletOrLogin(
                            creds.userAddress,
                            creds.signedMessageText,
                            creds.signedMessage,
                        );
                        if (!result.is_new && result.tokens && result.user) {
                            storeTokens(result.tokens);
                            storeUser(result.user);
                            // Refresh the stored credentials with the fresh tokens
                            storeWalletCredentials(creds.userAddress, creds.signedMessageText, creds.signedMessage);
                            setAccessToken(result.tokens.access);
                            setBackendUser(result.user);
                            console.log('✅ [AUTH] Silent re-auth succeeded');
                        } else {
                            // Backend rejected the stored credentials — clear them
                            clearAuth();
                            console.warn('⚠️ [AUTH] Silent re-auth rejected — clearing stored credentials');
                        }
                    } catch {
                        // Network error or backend rejection — clear stale credentials
                        clearAuth();
                        console.warn('⚠️ [AUTH] Silent re-auth failed — credentials cleared');
                    }
                }
                return;
            }

            // Access token still valid — restore session
            if (!isTokenExpired(savedToken)) {
                setAccessToken(savedToken);
                setBackendUser(savedUser);
                return;
            }

            // Access token expired — try refreshing
            console.log('🔄 [AUTH] Access token expired on mount, attempting refresh...');
            const newTokens = await refreshAccessToken();

            if (newTokens) {
                // Refresh succeeded — restore session with new token
                setAccessToken(newTokens.access);
                setBackendUser(savedUser);
                console.log('✅ [AUTH] Session restored via token refresh');
            } else {
                // Both tokens expired — full logout
                console.warn('⚠️ [AUTH] Session expired — logging out');
                clearAuth();
                setAccessToken(null);
                setBackendUser(null);
            }
        };

        validateSession();
    }, []);

    /**
     * Periodic token refresh: check every 5 minutes while the tab is active.
     * This prevents the access token from expiring mid-session.
     */
    useEffect(() => {
        // Only run if user is authenticated
        if (!accessToken) return;

        const interval = setInterval(async () => {
            const currentToken = getAccessToken();
            if (!currentToken) return;

            // If token expires within 5 minutes, proactively refresh
            if (isTokenExpired(currentToken)) {
                const newTokens = await refreshAccessToken();
                if (newTokens) {
                    setAccessToken(newTokens.access);
                    console.log('🔄 [AUTH] Proactive token refresh completed');
                } else {
                    // Refresh failed — session expired
                    console.warn('⚠️ [AUTH] Session expired during use — logging out');
                    clearAuth();
                    setAccessToken(null);
                    setBackendUser(null);
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => clearInterval(interval);
    }, [accessToken]);

    /**
     * Handle wallet connection and authentication
     * Checks if wallet is new or existing and routes accordingly
     */
    const handleWalletConnect = async (
        onNewUser?: () => void,
        onExistingUser?: () => void
    ) => {
        if (!isWalletConnected || !userData?.address) {
            console.error('Wallet not connected');
            return;
        }

        setIsAuthenticating(true);
        setAuthError(null);

        console.log('🔵 [AUTH] Starting wallet authentication for:', userData.address);

        try {
            // Request a wallet signature to prove ownership before hitting the backend.
            // Build a nonce-bearing message so each login attempt is unique.
            const nonce = Date.now().toString();
            const message = `DeOrganized login:${userData.address}:${nonce}`;
            console.log('🔵 [AUTH] Message to sign:', message);

            let signature: string;
            try {
                const sigResult = await request('stx_signMessage', { message });
                if (!sigResult?.signature) throw new Error('No signature returned');
                signature = sigResult.signature as string;
                console.log('✅ [AUTH] Wallet signature obtained');
                console.log('🔵 [AUTH] Signature prefix (first 40 chars):', signature.substring(0, 40));
                console.log('🔵 [AUTH] Signature length:', signature.length);
                console.log('🔵 [AUTH] Full sigResult keys:', Object.keys(sigResult));
            } catch {
                // User cancelled the signature prompt — do not proceed to backend.
                console.warn('⚠️ [AUTH] Signature cancelled');
                setAuthError('Signature required to log in. Please try again.');
                return;
            }

            console.log('🔵 [AUTH] POST body to wallet-login-or-check:', {
                wallet_address: userData.address,
                message,
                signature_prefix: signature.substring(0, 40) + '...',
                signature_length: signature.length,
            });
            const result = await checkWalletOrLogin(userData.address, message, signature);
            console.log('🔵 [AUTH] API Response:', { is_new: result.is_new, has_tokens: !!result.tokens, has_user: !!result.user });

            if (result.is_new) {
                // New user — store wallet + signature so setup can prove ownership to the backend.
                console.log('🟢 [AUTH] New user detected - navigating to setup');
                storePendingWallet(userData.address);
                if (signature) {
                    sessionStorage.setItem('pending_sig', signature);
                    sessionStorage.setItem('pending_msg', message);
                }
                onNewUser?.();
            } else {
                // Existing user - store tokens and user data
                console.log('🟢 [AUTH] Existing user detected');
                if (result.tokens && result.user) {
                    console.log('🟢 [AUTH] Storing tokens and user data...');
                    storeTokens(result.tokens);
                    storeUser(result.user);
                    storeWalletCredentials(userData.address, message, signature);
                    setAccessToken(result.tokens.access);
                    setBackendUser(result.user);
                    console.log('🟢 [AUTH] Calling onExistingUser callback...');
                    onExistingUser?.();
                    console.log('🟢 [AUTH] Callback completed');
                }
            }
        } catch (error: any) {
            console.error('❌ Wallet authentication failed:', error);
            setAuthError(error.message || 'Authentication failed');
        } finally {
            setIsAuthenticating(false);
        }
    };

    /**
     * Complete user setup after filling setup form
     */
    const handleCompleteSetup = async (
        payload: Omit<CompleteSetupPayload, 'wallet_address'>
    ) => {
        const walletAddress = userData?.address;

        if (!walletAddress) {
            setAuthError('Wallet address not found. Please connect wallet.');
            return;
        }

        setIsAuthenticating(true);
        setAuthError(null);

        try {
            const pendingSig = sessionStorage.getItem('pending_sig') || undefined;
            const pendingMsg = sessionStorage.getItem('pending_msg') || undefined;

            const result = await completeSetup({
                ...payload,
                wallet_address: walletAddress,
                stacks_signature: pendingSig,
                stacks_message: pendingMsg,
            });

            // Store tokens and user data
            storeTokens(result.tokens);
            storeUser(result.user);
            setAccessToken(result.tokens.access);
            setBackendUser(result.user);

            // Clean up one-time setup credentials
            sessionStorage.removeItem('pending_sig');
            sessionStorage.removeItem('pending_msg');

            // Navigate to stored redirect URL, or role-based default
            const redirect = sessionStorage.getItem('setup_redirect');
            sessionStorage.removeItem('setup_redirect');
            const destination = redirect && redirect !== '/register'
                ? redirect
                : result.user.role === 'creator' ? '/dashboard' : '/profile';
            window.location.replace(destination);
        } catch (error: any) {
            console.error('❌ Setup failed:', error);
            setAuthError(error.message || 'Setup failed');
            throw error;
        } finally {
            setIsAuthenticating(false);
        }
    };

    const logout = () => {
        signOut(); // Disconnect wallet
        setBackendUser(null);
        setAccessToken(null);
        setAuthError(null);
        clearAuth();
    };

    const clearAuthError = () => {
        setAuthError(null);
    };

    const refreshUser = async () => {
        try {
            // Use getValidAccessToken which auto-refreshes if needed
            const { getValidAccessToken } = await import('./walletAuth');
            const token = await getValidAccessToken();

            if (!token) {
                // Session expired — logout
                logout();
                return;
            }

            const { getCurrentUser } = await import('./api');
            const updatedUser = await getCurrentUser(token);
            storeUser(updatedUser);
            setBackendUser(updatedUser);
        } catch (error: any) {
            console.error('Failed to refresh user:', error);
            // If we get a 401, the session is dead
            if (error?.status === 401 || error?.message?.includes('401')) {
                logout();
            }
        }
    };

    const connectWallet = useCallback(async () => {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
            await signIn();
            // signIn() resolved: isWalletConnected = true, walletAddress = set.
            // Navbar useEffect will now trigger handleWalletConnect.
        } catch {
            // User dismissed the wallet selector — reset to initial state.
            setIsAuthenticating(false);
        }
    }, [signIn]);

    const value: AuthContextType = {
        isWalletConnected,
        walletAddress: userData?.address || null,
        bnsName: userData?.bnsName || null,
        connectWallet,
        disconnectWallet: signOut,

        isBackendAuthenticated: !!backendUser && !!accessToken,
        backendUser,
        accessToken,

        isAuthenticating,
        authError,

        handleWalletConnect,
        handleCompleteSetup,
        refreshUser,
        logout,
        clearAuthError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
