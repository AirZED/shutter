import React, { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { PublicKey } from "@solana/web3.js";

// Types
export interface WalletConnection {
    address: string;
    chain: 'solana' | 'sui';
    isConnected: boolean;
    publicKey?: PublicKey; // For Solana
}

export interface WalletContextType {
    connection: WalletConnection | null;
    isConnecting: boolean;
    error: string | null;
    connectSolanaWallet: () => Promise<void>;
    connectSuiWallet: () => Promise<void>;
    disconnectWallet: () => void;
    verifyNFT: (collectionAddress: string, requiredTraits?: Record<string, string>) => Promise<boolean>;
    showSuiConnectModal: boolean;
    setShowSuiConnectModal: Dispatch<SetStateAction<boolean>>;
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [connection, setConnection] = useState<WalletConnection | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuiConnectModal, setShowSuiConnectModal] = useState(false);

    // Solana hooks
    const solanaWallet = useSolanaWallet();
    const { setVisible } = useWalletModal();

    // Sui hooks
    const currentAccount = useCurrentAccount();
    const suiDisconnect = useDisconnectWallet();

    // Sync connection state from chain providers
    useEffect(() => {
        if (solanaWallet.connected && solanaWallet.publicKey) {
            setConnection({
                address: solanaWallet.publicKey.toBase58(),
                chain: 'solana',
                isConnected: true,
                publicKey: solanaWallet.publicKey,
            });
        } else if (currentAccount) {
            setConnection({
                address: currentAccount.address,
                chain: 'sui',
                isConnected: true,
            });
        } else {
            setConnection(null);
        }
    }, [solanaWallet.connected, solanaWallet.publicKey, currentAccount]);

    // Save connection to localStorage
    useEffect(() => {
        if (connection) {
            localStorage.setItem('wallet-connection', JSON.stringify(connection));
        } else {
            localStorage.removeItem('wallet-connection');
        }
    }, [connection]);

    const connectSolanaWallet = async () => {
        setIsConnecting(true);
        setError(null);
        try {
            await setVisible(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect Solana wallet';
            setError(errorMessage);
            throw err;
        } finally {
            setIsConnecting(false);
        }
    };

    const connectSuiWallet = async () => {
        setIsConnecting(true);
        setError(null);
        try {
            setShowSuiConnectModal(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect Sui wallet';
            setError(errorMessage);
            throw err;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = () => {
        if (!connection) return;

        setIsConnecting(true);
        try {
            if (connection.chain === 'solana') {
                solanaWallet.disconnect();
            } else if (connection.chain === 'sui') {
                suiDisconnect.mutate();
            }
        } catch (err) {
            console.error('Disconnect error:', err);
        } finally {
            setIsConnecting(false);
        }
    };

    const verifyNFT = async (collectionAddress: string, requiredTraits?: Record<string, string>): Promise<boolean> => {
        if (!connection) {
            throw new Error('No wallet connected');
        }

        try {
            if (connection.chain === 'solana') {
                // Placeholder for Solana NFT verification (implement with Metaplex/Umi for full support)
                console.log('Solana NFT verification placeholder - returning true');
                return true;
            } else if (connection.chain === 'sui') {
                const suiClient = new SuiClient({
                    url: getFullnodeUrl('testnet'),
                });

                // Paginate to get all owned objects
                let allOwnedObjects: Array<{ data?: { objectId?: string } }> = [];
                let cursor: string | undefined = undefined;
                do {
                    const ownedObjects = await suiClient.getOwnedObjects({
                        owner: connection.address,
                        filter: { MatchNone: [] },
                        cursor,
                        limit: 50,
                    });
                    allOwnedObjects = allOwnedObjects.concat(ownedObjects.data);
                    cursor = ownedObjects.nextCursor;
                } while (cursor);

                // Check each owned object for matching collection
                for (const object of allOwnedObjects) {
                    if (object.data?.objectId) {
                        const objectDetails = await suiClient.getObject({
                            id: object.data.objectId,
                            options: {
                                showContent: true,
                                showDisplay: true,
                                showType: true,
                            },
                        });

                        const data = objectDetails.data;
                        if (data?.type?.includes(collectionAddress) || (data?.content && 'fields' in data.content && (data.content.fields as Record<string, unknown>)?.collection_id === collectionAddress)) {
                            // Check traits if required
                            if (requiredTraits) {
                                const fields = (data.content && 'fields' in data.content) ? data.content.fields as Record<string, unknown> : {};
                                const traits: Record<string, string> = {};
                                if (fields.attributes && Array.isArray(fields.attributes)) {
                                    fields.attributes.forEach((attr: Record<string, unknown>) => {
                                        if (attr.key && attr.value && typeof attr.key === 'string' && typeof attr.value === 'string') {
                                            traits[attr.key] = attr.value;
                                        }
                                    });
                                }

                                // Check if required traits match
                                const hasRequiredTraits = Object.entries(requiredTraits).every(
                                    ([trait, value]) => traits[trait] === value
                                );

                                if (hasRequiredTraits) {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }
                    }
                }

                return false;
            }

            return false;
        } catch (error) {
            console.error('Error verifying NFT:', error);
            return false;
        }
    };

    const value: WalletContextType = {
        connection,
        isConnecting,
        error,
        connectSolanaWallet,
        connectSuiWallet,
        disconnectWallet,
        verifyNFT,
        showSuiConnectModal,
        setShowSuiConnectModal,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

// Hook to use wallet context
export const useWallet = () => {
    const context = useContext(WalletContext);

    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};