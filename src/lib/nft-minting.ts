import { walrusClient, suiClient } from './walrus';

// Types for media, gallery, and NFT minting
export interface MediaFile {
    file: File;
    name: string;
    description: string;
    type: 'image' | 'video' | 'audio';
}

export interface GalleryMedia {
    name: string;
    uri: string;
    type: 'image' | 'video' | 'audio';
}

export interface GalleryConfig {
    title: string;
    description: string;
    mediaFiles: MediaFile[];
    owner: string;
    visibility: 'public' | 'private';
    chain: 'solana' | 'sui';
    accessControl: {
        type: 'public' | 'nft_required' | 'trait_required';
        requiredNFT?: string;
        requiredTraits?: Record<string, string>;
    };
}

export interface NFTCollectionConfig {
    name: string;
    description: string;
    symbol: string;
    chain: 'solana' | 'sui';
    accessControl: {
        type: 'public' | 'nft_required' | 'trait_required';
        requiredNFT?: string;
        requiredTraits?: Record<string, string>;
    };
}

export interface MintedNFT {
    tokenId: string;
    transactionHash: string;
    chain: 'solana' | 'sui';
    metadataUri: string;
    imageUri: string;
}

export interface CreatedGallery {
    galleryId: string;
    galleryUri: string;
    transactionHash?: string;
    chain: 'solana' | 'sui';
}

// Mock implementation for utility functions that don't need React hooks
export async function uploadMediaToWalrus(
    mediaFile: MediaFile
): Promise<{
    imageUri: string;
    metadataUri: string;
}> {
    // This is a mock implementation for utility functions
    // Real implementation should use the useWalrusUpload hook in components
    const mockImageUrl = `https://walrus.testnet.space/files/${Date.now()}-${mediaFile.name}`;
    const mockMetadataUrl = `https://walrus.testnet.space/metadata/${Date.now()}-${mediaFile.name}-metadata.json`;

    console.log('Mock Walrus upload:', {
        mediaFile: mediaFile.name,
        imageUrl: mockImageUrl,
        metadataUrl: mockMetadataUrl,
    });

    return {
        imageUri: mockImageUrl,
        metadataUri: mockMetadataUrl,
    };
}

// Mock implementation for utility functions that don't need React hooks
export async function createGallery(
    config: GalleryConfig
): Promise<CreatedGallery> {
    // This is a mock implementation for utility functions
    // Real implementation should use the useWalrusUpload hook in components
    const galleryId = `${config.chain}_gallery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockGalleryUri = `https://walrus.testnet.space/galleries/${galleryId}`;
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    console.log('Mock gallery creation:', {
        galleryId,
        title: config.title,
        mediaCount: config.mediaFiles.length,
        visibility: config.visibility,
        galleryUri: mockGalleryUri,
    });

    return {
        galleryId,
        galleryUri: mockGalleryUri,
        transactionHash: mockTxHash,
        chain: config.chain,
    };
}

// Mint NFT tied to gallery access - still mock, integrate real minting later
export async function mintGalleryNFT(
    galleryId: string,
    collectionConfig: NFTCollectionConfig,
    walletAddress: string
): Promise<MintedNFT> {
    try {
        // In a real implementation, you would:
        // 1. Create metadata for the access NFT including galleryId
        // 2. Mint the NFT on the selected chain
        // 3. Optionally update gallery in MongoDB with the NFT contract

        // For demo purposes, return mock data
        const mockTokenId = `${collectionConfig.chain}_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        const mockMetadataUri = `https://walrus.testnet.space/metadata/access-${Date.now()}-gallery-${galleryId}.json`;
        const mockImageUri = 'https://walrus.testnet.space/files/access-pass.png'; // Default access pass image

        const metadata = {
            name: collectionConfig.name,
            description: `${collectionConfig.description} (Gallery ID: ${galleryId})`,
            image: mockImageUri,
            external_url: `https://yourapp.com/gallery/${galleryId}`,
            attributes: [
                {
                    trait_type: 'Gallery ID',
                    value: galleryId,
                },
                {
                    trait_type: 'Access Type',
                    value: collectionConfig.accessControl.type,
                },
                {
                    trait_type: 'Chain',
                    value: collectionConfig.chain,
                },
            ],
        };

        // Note: In a real implementation, you would update the gallery metadata in Walrus
        // with the NFT contract information, but for now we'll keep it simple

        console.log('Mock gallery NFT mint:', {
            galleryId,
            metadata,
            tokenId: mockTokenId
        });

        return {
            tokenId: mockTokenId,
            transactionHash: mockTxHash,
            chain: collectionConfig.chain,
            metadataUri: mockMetadataUri,
            imageUri: mockImageUri,
        };
    } catch (error) {
        console.error('Error minting gallery NFT:', error);
        throw new Error('Failed to mint gallery access NFT');
    }
}

// Retrieve gallery from Walrus
export async function getGallery(galleryUri: string): Promise<any> {
    try {
        // Extract blob ID from Walrus URI
        const blobId = galleryUri.replace('https://blob.walrus.testnet.space/', '');

        // Read the gallery metadata from Walrus
        const galleryBlob = await walrusClient.getBlob({ blobId });
        const galleryFiles = await galleryBlob.files();

        if (galleryFiles.length === 0) {
            throw new Error('No gallery files found');
        }

        const galleryFile = galleryFiles[0];
        const galleryData = await galleryFile.json();

        return galleryData;
    } catch (error) {
        console.error('Error retrieving gallery from Walrus:', error);
        throw new Error(`Failed to retrieve gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// List all galleries (in a real implementation, you'd have a registry or index)
export async function listGalleries(): Promise<any[]> {
    try {
        // In a real implementation, you would:
        // 1. Have a registry of gallery URIs stored somewhere (could be in Walrus too)
        // 2. Or use Walrus tags to search for galleries
        // 3. Or maintain an index of gallery metadata

        // For now, return mock galleries
        const mockGalleries = [
            {
                galleryId: 'solana_gallery_1',
                title: 'Sunset Photography Collection',
                description: 'A curated collection of breathtaking sunset photographs',
                galleryUri: 'https://blob.walrus.testnet.space/mock-gallery-1',
                owner: '0x123...',
                visibility: 'public',
                chain: 'solana',
                mediaCount: 12,
                participantCount: 24,
                isLocked: false,
            },
            {
                galleryId: 'sui_gallery_1',
                title: 'Exclusive Sui NFT Gallery',
                description: 'Premium digital art collection accessible only to verified Sui NFT holders',
                galleryUri: 'https://blob.walrus.testnet.space/mock-gallery-2',
                owner: '0x456...',
                visibility: 'private',
                chain: 'sui',
                mediaCount: 8,
                participantCount: 15,
                isLocked: true,
                requiredNFT: '0x1234567890abcdef1234567890abcdef12345678',
            },
        ];

        return mockGalleries;
    } catch (error) {
        console.error('Error listing galleries:', error);
        throw new Error(`Failed to list galleries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}