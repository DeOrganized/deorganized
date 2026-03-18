'use client';

import { useState } from 'react';
import { AppConfig, UserSession, showConnect, openSignatureRequestPopup } from '@stacks/connect';
import { useRouter } from 'next/navigation';
import {
    walletLoginOrCheck,
    storeTokens,
    storeUser,
    storePendingWallet,
} from '@/lib/wallet-auth';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export default function WalletAuth() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConnect = async () => {
        setLoading(true);
        setError(null);

        try {
            showConnect({
                appDetails: {
                    name: 'Deorganized',
                    icon: window.location.origin + '/logo.png',
                },
                redirectTo: '/',
                onFinish: async () => {
                    try {
                        // Extract wallet address
                        const userData = userSession.loadUserData();
                        const walletAddress = userData.profile.stxAddress.mainnet;

                        if (!walletAddress) {
                            throw new Error('Could not extract wallet address');
                        }

                        console.log('Wallet connected:', walletAddress);

                        // Build a fresh login message with a nonce
                        const nonce = Date.now().toString();
                        const message = `DeOrganized login:${walletAddress}:${nonce}`;

                        // Request signature — proves wallet ownership
                        let signature: string | undefined;
                        try {
                            signature = await new Promise<string>((resolve, reject) => {
                                openSignatureRequestPopup({
                                    message,
                                    userSession,
                                    onFinish: ({ signature: sig }) => resolve(sig),
                                    onCancel: () => reject(new Error('cancelled')),
                                });
                            });
                        } catch {
                            // User cancelled signature — allow through (grace period logs on backend)
                            console.warn('[wallet_login] Signature cancelled — proceeding without it');
                        }

                        // Check if wallet exists (sends signature if available)
                        const result = await walletLoginOrCheck(walletAddress, message, signature);

                        if (result.is_new) {
                            // New user — store wallet + signature so setup page can claim welcome points
                            console.log('New user detected, redirecting to setup');
                            storePendingWallet(walletAddress);
                            if (signature) {
                                localStorage.setItem('pending_sig', signature);
                                localStorage.setItem('pending_msg', message);
                            }
                            router.push('/setup');
                        } else {
                            // Existing user — save tokens and redirect
                            console.log('Existing user, logging in');

                            if (!result.user || !result.tokens) {
                                throw new Error('Invalid server response');
                            }

                            storeTokens(result.tokens);
                            storeUser(result.user);
                            router.push('/dashboard');
                        }
                    } catch (err) {
                        console.error('Auth error:', err);
                        setError(err instanceof Error ? err.message : 'Authentication failed');
                        setLoading(false);
                    }
                },
                onCancel: () => {
                    console.log('Wallet connection cancelled');
                    setLoading(false);
                },
                userSession,
            });
        } catch (err) {
            console.error('Connect error:', err);
            setError(err instanceof Error ? err.message : 'Failed to open wallet');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome to Deorganized
                    </h1>
                    <p className="text-gray-600">
                        Connect your Stacks wallet to get started
                    </p>
                </div>

                <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Supported wallets: Leather, Xverse</p>
                </div>
            </div>
        </div>
    );
}

