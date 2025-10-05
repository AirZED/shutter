import { useState, useEffect, useCallback } from 'react';
import { WalletConnection, verifyNFTAccess, NFTVerificationResult } from '@/lib/wallet';

export interface WalletState {
    connection: WalletConnection | null;
    isConnecting: boolean;
    error: string | null;
}

export interface NFTVerificationState {
    isVerifying: boolean;
    verificationResult: NFTVerificationResult | null;
    error: string | null;
}

export function useWallet() {
    const [walletState, setWalletState] = useState<WalletState>({
        connection: null,
        isConnecting: false,
        error: null,
    });

    const [nftVerification, setNftVerification] = useState<NFTVerificationState>({
        isVerifying: false,
        verificationResult: null,
        error: null,
    });

    // Connect to Solana wallet
    const connectSolanaWallet = useCallback(async () => {
        setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Check if Phantom wallet is available
            if (typeof window !== 'undefined' && (window as any).solana?.isPhantom) {
                const response = await (window as any).solana.connect();

                const connection: WalletConnection = {
                    address: response.publicKey.toString(),
                    chain: 'solana',
                    isConnected: true,
                };

                setWalletState({
                    connection,
                    isConnecting: false,
                    error: null,
                });

                return connection;
            } else {
                throw new Error('Phantom wallet not found. Please install Phantom wallet.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Solana wallet';
            setWalletState(prev => ({
                ...prev,
                isConnecting: false,
                error: errorMessage,
            }));
            throw error;
        }
    }, []);

    // Connect to Sui wallet
    const connectSuiWallet = useCallback(async () => {
        setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            // Check if Sui wallet is available
            if (typeof window !== 'undefined' && (window as any).suiWallet) {
                const accounts = await (window as any).suiWallet.getAccounts();

                if (accounts.length > 0) {
                    const connection: WalletConnection = {
                        address: accounts[0].address,
                        chain: 'sui',
                        isConnected: true,
                    };

                    setWalletState({
                        connection,
                        isConnecting: false,
                        error: null,
                    });

                    return connection;
                } else {
                    throw new Error('No accounts found in Sui wallet');
                }
            } else {
                throw new Error('Sui wallet not found. Please install Sui wallet.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Sui wallet';
            setWalletState(prev => ({
                ...prev,
                isConnecting: false,
                error: errorMessage,
            }));
            throw error;
        }
    }, []);

    // Disconnect wallet
    const disconnectWallet = useCallback(() => {
        setWalletState({
            connection: null,
            isConnecting: false,
            error: null,
        });
        setNftVerification({
            isVerifying: false,
            verificationResult: null,
            error: null,
        });
    }, []);

    // Verify NFT access
    const verifyNFT = useCallback(async (
        collectionAddress: string,
        requiredTraits?: Record<string, string>
    ) => {
        if (!walletState.connection) {
            throw new Error('No wallet connected');
        }

        setNftVerification(prev => ({ ...prev, isVerifying: true, error: null }));

        try {
            const result = await verifyNFTAccess(
                walletState.connection.address,
                walletState.connection.chain,
                collectionAddress,
                requiredTraits
            );

            setNftVerification({
                isVerifying: false,
                verificationResult: result,
                error: null,
            });

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to verify NFT';
            setNftVerification(prev => ({
                ...prev,
                isVerifying: false,
                error: errorMessage,
            }));
            throw error;
        }
    }, [walletState.connection]);

    // Check if wallet is connected
    const isConnected = walletState.connection?.isConnected || false;

    // Get wallet address
    const address = walletState.connection?.address || null;

    // Get connected chain
    const chain = walletState.connection?.chain || null;

    return {
        // Wallet state
        isConnected,
        address,
        chain,
        isConnecting: walletState.isConnecting,
        error: walletState.error,

        // Wallet actions
        connectSolanaWallet,
        connectSuiWallet,
        disconnectWallet,

        // NFT verification
        verifyNFT,
        nftVerification,
    };
}
