import { walrusClient } from './walrus';
import { Connection, PublicKey } from '@solana/web3.js';
import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';

// Cross-network types
export interface CrossNetworkAsset {
    id: string;
    name: string;
    description: string;
    imageUri: string;
    metadataUri: string;
    chain: 'solana' | 'sui';
    tokenId?: string;
    collectionAddress?: string;
    traits?: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}

export interface CrossNetworkCollection {
    id: string;
    name: string;
    description: string;
    symbol: string;
    chain: 'solana' | 'sui';
    collectionAddress: string;
    accessControl: {
        type: 'public' | 'nft_required' | 'trait_required';
        requiredNFT?: string;
        requiredTraits?: Record<string, string>;
    };
    assets: CrossNetworkAsset[];
    createdAt: string;
}

// Cross-network asset management
export class CrossNetworkManager {
    private solanaConnection: Connection;
    private suiClient: SuiClient;

    constructor() {
        this.solanaConnection = new Connection('https://api.testnet.solana.com', 'confirmed');
        this.suiClient = new SuiClient({
            url: getFullnodeUrl('testnet'),
        });
    }

    // Upload asset to Walrus (works for any network)
    async uploadAsset(file: File, metadata: any): Promise<{
        imageUri: string;
        metadataUri: string;
    }> {
        try {
            // Upload file to Walrus
            const uploadResult = await walrusClient.upload({
                file,
                name: metadata.name,
            });

            // Create enhanced metadata
            const enhancedMetadata = {
                ...metadata,
                image: uploadResult.url,
                external_url: uploadResult.url,
                attributes: [
                    ...(metadata.attributes || []),
                    {
                        trait_type: 'Storage',
                        value: 'Walrus',
                    },
                    {
                        trait_type: 'Upload Date',
                        value: new Date().toISOString(),
                    },
                    {
                        trait_type: 'File Size',
                        value: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                    },
                    {
                        trait_type: 'MIME Type',
                        value: file.type,
                    },
                ],
                properties: {
                    files: [
                        {
                            uri: uploadResult.url,
                            type: file.type,
                        },
                    ],
                    category: file.type.startsWith('image/') ? 'image' :
                        file.type.startsWith('video/') ? 'video' : 'audio',
                },
            };

            // Upload metadata to Walrus
            const metadataBlob = new Blob([JSON.stringify(enhancedMetadata, null, 2)], {
                type: 'application/json',
            });

            const metadataFile = new File([metadataBlob], `${metadata.name}-metadata.json`, {
                type: 'application/json',
            });

            const metadataResult = await walrusClient.upload({
                file: metadataFile,
                name: `${metadata.name}-metadata`,
            });

            return {
                imageUri: uploadResult.url,
                metadataUri: metadataResult.url,
            };
        } catch (error) {
            console.error('Error uploading asset to Walrus:', error);
            throw new Error('Failed to upload asset to Walrus');
        }
    }

    // Verify NFT access across networks
    async verifyNFTAccess(
        walletAddress: string,
        chain: 'solana' | 'sui',
        collectionAddress: string,
        requiredTraits?: Record<string, string>
    ): Promise<{
        hasAccess: boolean;
        nftMetadata?: any;
        traits?: Record<string, string>;
    }> {
        try {
            if (chain === 'solana') {
                return await this.verifySolanaNFT(walletAddress, collectionAddress, requiredTraits);
            } else if (chain === 'sui') {
                return await this.verifySuiNFT(walletAddress, collectionAddress, requiredTraits);
            }

            return { hasAccess: false };
        } catch (error) {
            console.error('Error verifying NFT access:', error);
            return { hasAccess: false };
        }
    }

    // Verify Solana NFT
    private async verifySolanaNFT(
        walletAddress: string,
        collectionAddress: string,
        requiredTraits?: Record<string, string>
    ): Promise<{
        hasAccess: boolean;
        nftMetadata?: any;
        traits?: Record<string, string>;
    }> {
        try {
            const publicKey = new PublicKey(walletAddress);

            // Get token accounts for the wallet
            const tokenAccounts = await this.solanaConnection.getTokenAccountsByOwner(publicKey, {
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            });

            // Check if wallet owns any NFTs from the collection
            for (const account of tokenAccounts.value) {
                const accountInfo = await this.solanaConnection.getAccountInfo(account.pubkey);
                if (accountInfo?.data) {
                    // In a real implementation, you'd verify the collection membership
                    // For demo purposes, we'll return true if the wallet has any NFTs
                    return {
                        hasAccess: true,
                        nftMetadata: {
                            name: 'Solana NFT',
                            description: 'NFT from Solana collection',
                            image: 'https://example.com/nft-image.png',
                            attributes: [
                                { trait_type: 'Chain', value: 'Solana' },
                                { trait_type: 'Collection', value: collectionAddress },
                            ],
                        },
                        traits: {
                            Chain: 'Solana',
                            Collection: collectionAddress,
                        },
                    };
                }
            }

            return { hasAccess: false };
        } catch (error) {
            console.error('Error verifying Solana NFT:', error);
            return { hasAccess: false };
        }
    }

    // Verify Sui NFT
    private async verifySuiNFT(
        walletAddress: string,
        collectionId: string,
        requiredTraits?: Record<string, string>
    ): Promise<{
        hasAccess: boolean;
        nftMetadata?: any;
        traits?: Record<string, string>;
    }> {
        try {
            // Get owned objects for the wallet
            const ownedObjects = await this.suiClient.getOwnedObjects({
                owner: walletAddress,
                filter: {
                    StructType: '0x2::nft::Nft',
                },
            });

            // Check if any owned objects match the collection
            for (const object of ownedObjects.data) {
                if (object.data?.objectId) {
                    const objectDetails = await this.suiClient.getObject({
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
                                hasAccess: true,
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

            return { hasAccess: false };
        } catch (error) {
            console.error('Error verifying Sui NFT:', error);
            return { hasAccess: false };
        }
    }

    // Create cross-network collection
    async createCollection(
        name: string,
        description: string,
        symbol: string,
        chain: 'solana' | 'sui',
        accessControl: {
            type: 'public' | 'nft_required' | 'trait_required';
            requiredNFT?: string;
            requiredTraits?: Record<string, string>;
        }
    ): Promise<CrossNetworkCollection> {
        const collectionId = `${chain}_collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const collection: CrossNetworkCollection = {
            id: collectionId,
            name,
            description,
            symbol,
            chain,
            collectionAddress: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock address
            accessControl,
            assets: [],
            createdAt: new Date().toISOString(),
        };

        // Store collection metadata on Walrus
        const collectionMetadata = {
            ...collection,
            type: 'collection',
            version: '1.0',
        };

        const metadataBlob = new Blob([JSON.stringify(collectionMetadata, null, 2)], {
            type: 'application/json',
        });

        const metadataFile = new File([metadataBlob], `${collectionId}-collection.json`, {
            type: 'application/json',
        });

        await walrusClient.upload({
            file: metadataFile,
            name: `${collectionId}-collection`,
        });

        return collection;
    }

    // Add asset to collection
    async addAssetToCollection(
        collectionId: string,
        file: File,
        metadata: any,
        chain: 'solana' | 'sui'
    ): Promise<CrossNetworkAsset> {
        // Upload asset to Walrus
        const { imageUri, metadataUri } = await this.uploadAsset(file, metadata);

        const asset: CrossNetworkAsset = {
            id: `${chain}_asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: metadata.name,
            description: metadata.description,
            imageUri,
            metadataUri,
            chain,
            tokenId: `${chain}_token_${Date.now()}`,
            collectionAddress: collectionId,
            traits: metadata.attributes?.reduce((acc: Record<string, string>, attr: any) => {
                acc[attr.trait_type] = attr.value;
                return acc;
            }, {}),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Store asset metadata on Walrus
        const assetMetadata = {
            ...asset,
            type: 'asset',
            version: '1.0',
        };

        const metadataBlob = new Blob([JSON.stringify(assetMetadata, null, 2)], {
            type: 'application/json',
        });

        const assetMetadataFile = new File([metadataBlob], `${asset.id}-asset.json`, {
            type: 'application/json',
        });

        await walrusClient.upload({
            file: assetMetadataFile,
            name: `${asset.id}-asset`,
        });

        return asset;
    }
}

// Export singleton instance
export const crossNetworkManager = new CrossNetworkManager();
