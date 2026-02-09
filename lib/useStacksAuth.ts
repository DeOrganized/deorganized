import { useState, useEffect } from 'react';
import { connect, disconnect, isConnected, getLocalStorage } from '@stacks/connect';

interface UserData {
    address: string;
    bnsName?: string;
}

interface UseStacksAuthReturn {
    isAuthenticated: boolean;
    userData: UserData | null;
    signIn: () => void;
    signOut: () => void;
}

export const useStacksAuth = (): UseStacksAuthReturn => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);

    // Fetch BNS name from Hiro API
    const fetchBNSName = async (address: string): Promise<string | undefined> => {
        try {
            const response = await fetch(`https://api.hiro.so/v2/addresses/stacks/${address}/valid`);
            if (response.ok) {
                const data = await response.json();
                return data.names?.[0]; // Return first BNS name if available
            }
        } catch (error) {
            console.error('Failed to fetch BNS name:', error);
        }
        return undefined;
    };

    // Load existing connection on mount
    useEffect(() => {
        const checkConnection = async () => {
            const connected = await isConnected();

            if (connected) {
                const localData = getLocalStorage();

                if (localData?.addresses?.stx?.[0]?.address) {
                    const address = localData.addresses.stx[0].address;
                    const bnsName = await fetchBNSName(address);

                    setUserData({ address, bnsName });
                    setIsAuthenticated(true);
                }
            }
        };

        checkConnection();
    }, []);

    // Sign in with wallet
    const signIn = () => {
        console.log('🔵 [STACKS AUTH] signIn() called');
        // @ts-ignore - connect options type mismatch but works at runtime
        connect({
            appDetails: {
                name: 'Deorganized',
                icon: window.location.origin + '/logo.png',
            },
            onFinish: async () => {
                console.log('🟢 [STACKS AUTH] onFinish callback triggered!');
                try {
                    // Get connection data from localStorage
                    const localData = getLocalStorage();
                    console.log('🔍 [STACKS AUTH] localData:', localData);

                    if (localData?.addresses?.stx?.[0]?.address) {
                        const address = localData.addresses.stx[0].address;
                        console.log('🔍 [STACKS AUTH] Address found:', address);

                        const bnsName = await fetchBNSName(address);
                        console.log('🔍 [STACKS AUTH] BNS name:', bnsName);

                        setUserData({ address, bnsName });
                        setIsAuthenticated(true);
                        console.log('🔍 [STACKS AUTH] State updated, about to reload...');

                        // Small delay to ensure state is saved
                        setTimeout(() => {
                            console.log('✅ [STACKS AUTH] EXECUTING RELOAD NOW!');
                            window.location.reload();
                        }, 500);
                    } else {
                        console.error('❌ [STACKS AUTH] No address found in localData!');
                    }
                } catch (error) {
                    console.error('❌ [STACKS AUTH] Error in onFinish:', error);
                }
            },
            onCancel: () => {
                console.log('❌ [STACKS AUTH] User cancelled wallet connection');
            },
        });

        // WORKAROUND: onFinish callback doesn't always fire reliably  
        // Poll to detect when connection completes
        console.log('⏰ [STACKS AUTH] Starting connection polling...');
        let pollCount = 0;
        const maxPolls = 20; // Poll for up to 10 seconds

        const pollInterval = setInterval(async () => {
            pollCount++;
            console.log(`🔍 [STACKS AUTH] Poll ${pollCount}/${maxPolls} - checking connection...`);

            const connected = await isConnected();
            const localData = getLocalStorage();

            if (connected && localData?.addresses?.stx?.[0]?.address && !isAuthenticated) {
                console.log('✅ [STACKS AUTH] Connection detected via polling - reloading!');
                clearInterval(pollInterval);
                window.location.reload();
            } else if (pollCount >= maxPolls) {
                console.log('⏱️ [STACKS AUTH] Polling timeout - connection may have failed or was cancelled');
                clearInterval(pollInterval);
            }
        }, 500); // Poll every 500ms
    };

    // Sign out
    const signOut = () => {
        disconnect();
        setUserData(null);
        setIsAuthenticated(false);

        // Clear any additional stored data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');

        // Note: Using custom navigation instead of react-router-dom
        // console.log('Wallet disconnected');
    };

    return {
        isAuthenticated,
        userData,
        signIn,
        signOut,
    };
};
