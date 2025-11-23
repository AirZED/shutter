import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { walrusClient } from '@/lib/walrus';
import { WalrusFile } from '@mysten/walrus';
import { MediaFile, GalleryMedia } from '@/lib/nft-minting';

export const useWalrusUpload = () => {
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Upload single media to Walrus and get URI
    const uploadMediaToWalrus = async (mediaFile: MediaFile): Promise<{
        imageUri: string;
        metadataUri: string;
    }> => {
        try {
            // Step 1: Create and encode the flow
            const mediaWalrusFile = walrusClient.writeFilesFlow({
                files: [
                    WalrusFile.from({
                        contents: new Uint8Array(await mediaFile.file.arrayBuffer()),
                        identifier: mediaFile.name,
                    }),
                ],
            });
            await mediaWalrusFile.encode();

            // Step 2: Register media blob (requires user sign - popup)
            const mediaRegisterTx = mediaWalrusFile.register({
                epochs: 3, // Adjust as needed for storage duration
                owner: '', // Will be set by dapp-kit signer
                deletable: true,
            });

            const mediaRegisterResult = await signAndExecuteTransaction({
                transaction: mediaRegisterTx,
            });

            // Step 3: Upload media to storage nodes
            await mediaWalrusFile.upload({ digest: mediaRegisterResult.digest });

            // Step 4: Certify media blob (requires user sign - popup)
            const mediaCertifyTx = mediaWalrusFile.certify();
            await signAndExecuteTransaction({
                transaction: mediaCertifyTx,
            });

            // Step 5: Get media files and extract blob ID
            const mediaFiles = await mediaWalrusFile.listFiles();
            if (mediaFiles.length === 0) {
                throw new Error('No files listed after certification');
            }
            const mediaBlobId = mediaFiles[0].blobId;
            const imageUri = `https://blob.walrus.testnet.space/${mediaBlobId}`;

            console.log('Media upload complete:', { imageUri });

            // Step 6: Create and upload metadata
            const metadata = {
                name: mediaFile.name,
                description: mediaFile.description,
                image: imageUri,
                external_url: imageUri,
                attributes: [
                    {
                        trait_type: 'Type',
                        value: mediaFile.type,
                    },
                    {
                        trait_type: 'Upload Date',
                        value: new Date().toISOString(),
                    },
                    {
                        trait_type: 'Storage',
                        value: 'Walrus',
                    },
                    {
                        trait_type: 'File Size',
                        value: `${(mediaFile.file.size / 1024 / 1024).toFixed(2)} MB`,
                    },
                    {
                        trait_type: 'MIME Type',
                        value: mediaFile.file.type,
                    },
                ],
                properties: {
                    files: [
                        {
                            uri: imageUri,
                            type: mediaFile.file.type,
                        },
                    ],
                    category: mediaFile.type,
                },
            };

            const metadataFlow = walrusClient.writeFilesFlow({
                files: [
                    WalrusFile.from({
                        contents: new Uint8Array(new TextEncoder().encode(JSON.stringify(metadata))),
                        identifier: `${mediaFile.name}-metadata.json`,
                    }),
                ],
            });
            await metadataFlow.encode();

            const metadataRegisterTx = metadataFlow.register({
                epochs: 3,
                owner: '', // Set by signer
                deletable: true,
            });

            const metadataRegisterResult = await signAndExecuteTransaction({
                transaction: metadataRegisterTx,
            });

            await metadataFlow.upload({ digest: metadataRegisterResult.digest });

            const metadataCertifyTx = metadataFlow.certify();
            await signAndExecuteTransaction({
                transaction: metadataCertifyTx,
            });

            const metadataFiles = await metadataFlow.listFiles();
            if (metadataFiles.length === 0) {
                throw new Error('No metadata files listed after certification');
            }
            const metadataBlobId = metadataFiles[0].blobId;
            const metadataUri = `https://blob.walrus.testnet.space/${metadataBlobId}`;

            console.log('Metadata upload complete:', { metadataUri });

            return {
                imageUri,
                metadataUri,
            };
        } catch (error) {
            console.error('Error uploading to Walrus:', error);
            throw new Error(`Failed to upload media to Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Upload gallery metadata to Walrus
    const uploadGalleryToWalrus = async (
        galleryId: string,
        title: string,
        description: string,
        mediaUris: GalleryMedia[],
        owner: string,
        visibility: 'public' | 'private',
        chain: 'solana' | 'sui',
        accessControl: {
            type: 'public' | 'nft_required' | 'trait_required';
            requiredNFT?: string;
            requiredTraits?: Record<string, string>;
        }
    ): Promise<{
        galleryUri: string;
        transactionHash: string;
    }> => {
        try {
            // Create gallery metadata
            const galleryMetadata = {
                galleryId,
                title,
                description,
                mediaUris,
                owner,
                visibility,
                chain,
                accessControl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                participantCount: 0,
                isLocked: visibility === 'private',
            };

            // Upload gallery metadata to Walrus
            const galleryFlow = walrusClient.writeFilesFlow({
                files: [
                    WalrusFile.from({
                        contents: new Uint8Array(new TextEncoder().encode(JSON.stringify(galleryMetadata, null, 2))),
                        identifier: `${galleryId}-metadata.json`,
                        tags: {
                            'content-type': 'application/json',
                            'gallery-id': galleryId,
                            'owner': owner,
                            'chain': chain,
                        },
                    }),
                ],
            });

            await galleryFlow.encode();

            // Register gallery metadata blob
            const galleryRegisterTx = galleryFlow.register({
                epochs: 3,
                owner: '', // Set by signer
                deletable: true,
            });

            const galleryRegisterResult = await signAndExecuteTransaction({
                transaction: galleryRegisterTx,
            });

            // Upload gallery metadata to storage nodes
            await galleryFlow.upload({ digest: galleryRegisterResult.digest });

            // Certify gallery metadata blob
            const galleryCertifyTx = galleryFlow.certify();
            await signAndExecuteTransaction({
                transaction: galleryCertifyTx,
            });

            // Get gallery metadata URI
            const galleryFiles = await galleryFlow.listFiles();
            if (galleryFiles.length === 0) {
                throw new Error('No gallery files listed after certification');
            }
            const galleryBlobId = galleryFiles[0].blobId;
            const galleryUri = `https://blob.walrus.testnet.space/${galleryBlobId}`;

            console.log('Gallery created and stored in Walrus:', {
                galleryId,
                title,
                mediaCount: mediaUris.length,
                visibility,
                galleryUri,
            });

            return {
                galleryUri,
                transactionHash: galleryRegisterResult.digest,
            };
        } catch (error) {
            console.error('Error creating gallery in Walrus:', error);
            throw new Error(`Failed to create gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return {
        uploadMediaToWalrus,
        uploadGalleryToWalrus,
    };
};
