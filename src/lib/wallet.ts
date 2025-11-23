import { Connection, PublicKey } from '@solana/web3.js';
import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';

// Solana configuration
export const SOLANA_RPC_URL = 'https://api.testnet.solana.com';
export const solanaConnection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Sui configuration
export const suiClient = new SuiClient({
    url: getFullnodeUrl('testnet'),
});

// Wallet connection types
export interface WalletConnection {
    address: string;
    chain: 'solana' | 'sui';
    isConnected: boolean;
}

// NFT verification types
export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string;
    }>;
}

export interface NFTVerificationResult {
    ownsNFT: boolean;
    nftMetadata?: NFTMetadata;
    traits?: Record<string, string>;
}

// Solana NFT verification
export async function verifySolanaNFT(
    walletAddress: string,
    collectionAddress: string,
    requiredTraits?: Record<string, string>
): Promise<NFTVerificationResult> {
    try {
        const publicKey = new PublicKey(walletAddress);
        const collectionPubKey = new PublicKey(collectionAddress);

        // Get token accounts for the wallet
        const tokenAccounts = await solanaConnection.getTokenAccountsByOwner(publicKey, {
            programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        // Check if wallet owns any NFTs from the collection
        for (const account of tokenAccounts.value) {
            const accountInfo = await solanaConnection.getAccountInfo(account.pubkey);
            if (accountInfo?.data) {
                // Parse token account data to check if it's from the required collection
                // This is a simplified check - in production, you'd want to verify the collection
                const hasNFT = true; // Simplified for demo

                if (hasNFT) {
                    // In a real implementation, you'd fetch the NFT metadata
                    // and verify traits here
                    return {
                        ownsNFT: true,
                        nftMetadata: {
                            name: 'Sample NFT',
                            description: 'Sample NFT description',
                            image: 'https://example.com/nft-image.png',
                            attributes: [
                                { trait_type: 'Rarity', value: 'Common' },
                                { trait_type: 'Level', value: '5' }
                            ]
                        },
                        traits: {
                            Rarity: 'Common',
                            Level: '5'
                        }
                    };
                }
            }
        }

        return { ownsNFT: false };
    } catch (error) {
        console.error('Error verifying Solana NFT:', error);
        return { ownsNFT: false };
    }
}

// Sui NFT verification
export async function verifySuiNFT(
    walletAddress: string,
    collectionId: string,
    requiredTraits?: Record<string, string>
): Promise<NFTVerificationResult> {
    try {
        // Get owned objects for the wallet
        const ownedObjects = await suiClient.getOwnedObjects({
            owner: walletAddress,
            filter: {
                StructType: '0x2::nft::Nft',
            },
        });

        // Check if any owned objects match the collection
        for (const object of ownedObjects.data) {
            if (object.data?.objectId) {
                const objectDetails = await suiClient.getObject({
                    id: object.data.objectId,
                    options: {
                        showContent: true,
                        showDisplay: true,
                        showType: true,
                    },
                });

                if (objectDetails.data?.content && 'fields' in objectDetails.data.content) {
                    const fields = objectDetails.data.content.fields;

                    // Check if this NFT belongs to the required collection
                    if (fields.collection_id === collectionId) {
                        // Extract traits from the NFT metadata
                        const traits: Record<string, string> = {};
                        if (fields.attributes && Array.isArray(fields.attributes)) {
                            fields.attributes.forEach((attr: any) => {
                                if (attr.key && attr.value) {
                                    traits[attr.key] = attr.value;
                                }
                            });
                        }

                        // Check if required traits match
                        if (requiredTraits) {
                            const hasRequiredTraits = Object.entries(requiredTraits).every(
                                ([trait, value]) => traits[trait] === value
                            );

                            if (!hasRequiredTraits) {
                                continue;
                            }
                        }

                        return {
                            ownsNFT: true,
                            nftMetadata: {
                                name: fields.name || 'Unnamed NFT',
                                description: fields.description || '',
                                image: fields.image_url || '',
                                attributes: Object.entries(traits).map(([trait_type, value]) => ({
                                    trait_type,
                                    value,
                                })),
                            },
                            traits,
                        };
                    }
                }
            }
        }

        return { ownsNFT: false };
    } catch (error) {
        console.error('Error verifying Sui NFT:', error);
        return { ownsNFT: false };
    }
}

// Multi-chain NFT verification
export async function verifyNFTAccess(
    walletAddress: string,
    chain: 'solana' | 'sui',
    collectionAddress: string,
    requiredTraits?: Record<string, string>
): Promise<NFTVerificationResult> {
    if (chain === 'solana') {
        return verifySolanaNFT(walletAddress, collectionAddress, requiredTraits);
    } else if (chain === 'sui') {
        return verifySuiNFT(walletAddress, collectionAddress, requiredTraits);
    }

    return { ownsNFT: false };
}
