import { useState, useEffect } from 'react';
import { connect, disconnect, isConnected, getLocalStorage } from '@stacks/connect';

interface UserData {
    address: string;
    bnsName?: string;
}

interface UseStacksAuthReturn {
    isAuthenticated: boolean;
    userData: UserData | null;
    signIn: () => Promise<void>;
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

    // Load existing connection on mount (returning users)
    useEffect(() => {
        const checkConnection = async () => {
            // isConnected() is synchronous in @stacks/connect v8
            if (isConnected()) {
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

    // Sign in with wallet using the v8 Promise-based API.
    // connect() resolves after the user approves in the wallet selector —
    // no reload, no polling, no setTimeout needed.
    const signIn = async (): Promise<void> => {
        await connect({
            appDetails: {
                name: 'Deorganized',
                icon: window.location.origin + '/logo.png',
            },
        });

        // connect() resolved — address is synchronously available in localStorage
        const localData = getLocalStorage();

        if (localData?.addresses?.stx?.[0]?.address) {
            const address = localData.addresses.stx[0].address;
            const bnsName = await fetchBNSName(address);

            setUserData({ address, bnsName });
            setIsAuthenticated(true);
        }
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
        localStorage.removeItem('userAddress');
        localStorage.removeItem('signedMessage');
        localStorage.removeItem('signedMessageText');
    };

    return {
        isAuthenticated,
        userData,
        signIn,
        signOut,
    };
};
