import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStacksAuth } from './useStacksAuth';
import {
    checkWalletOrLogin,
    completeSetup,
    storeTokens,
    storeUser,
    clearAuth,
    getStoredUser,
    getAccessToken,
    storePendingWallet,
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

    // Load tokens and user from localStorage on mount
    useEffect(() => {
        const savedToken = getAccessToken();
        const savedUser = getStoredUser();

        if (savedToken && savedUser) {
            setAccessToken(savedToken);
            setBackendUser(savedUser);
        }
    }, []);

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
            const result = await checkWalletOrLogin(userData.address);
            console.log('🔵 [AUTH] API Response:', { is_new: result.is_new, has_tokens: !!result.tokens, has_user: !!result.user });

            if (result.is_new) {
                // New user - store wallet for setup and navigate to setup page
                console.log('🟢 [AUTH] New user detected - navigating to setup');
                storePendingWallet(userData.address);
                onNewUser?.();
            } else {
                // Existing user - store tokens and user data
                console.log('🟢 [AUTH] Existing user detected');
                if (result.tokens && result.user) {
                    console.log('🟢 [AUTH] Storing tokens and user data...');
                    storeTokens(result.tokens);
                    storeUser(result.user);
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
            const result = await completeSetup({
                ...payload,
                wallet_address: walletAddress,
            });

            // Store tokens and user data
            storeTokens(result.tokens);
            storeUser(result.user);
            setAccessToken(result.tokens.access);
            setBackendUser(result.user);

            // Auto-refresh to update UI with authenticated state
            window.location.reload();
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
        const token = getAccessToken();
        if (!token) return;

        try {
            const { getCurrentUser } = await import('./api');
            const updatedUser = await getCurrentUser(token);
            storeUser(updatedUser);
            setBackendUser(updatedUser);
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const value: AuthContextType = {
        isWalletConnected,
        walletAddress: userData?.address || null,
        bnsName: userData?.bnsName || null,
        connectWallet: signIn,
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
