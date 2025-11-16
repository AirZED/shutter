import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import axios from 'axios';
import { MediaFile, GalleryMedia } from '@/lib/nft-minting';

const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export const useWalrusUpload = () => {
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Upload single media to Walrus using HTTP API (like /mint page)
    const uploadMediaToWalrus = async (mediaFile: MediaFile): Promise<{
        imageUri: string;
        metadataUri: string;
    }> => {
        try {
            // Upload to Walrus publisher using Axios (HTTP API - no WebAssembly needed)
            const response = await axios.put(
                `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
                mediaFile.file,
                {
                    headers: {
                        "Content-Type": mediaFile.file.type || "image/jpeg",
                    },
                }
            );

            const result = response.data;
            console.log("Upload result:", result);

            let blobId: string;
            if (result.newlyCreated) {
                const blob = result.newlyCreated.blobObject;
                blobId = blob.blobId;
            } else if (result.alreadyCertified) {
                blobId = result.alreadyCertified.blobId;
            } else {
                throw new Error('Unexpected upload response format');
            }

            const imageUri = `${AGGREGATOR}/v1/blobs/${blobId}`;
            console.log('Media upload complete:', { imageUri, blobId });

            // Create and upload metadata using HTTP API
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

            // Upload metadata as JSON blob
            const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
                type: 'application/json',
            });
            const metadataFile = new File([metadataBlob], `${mediaFile.name}-metadata.json`, {
                type: 'application/json',
            });

            const metadataResponse = await axios.put(
                `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
                metadataFile,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const metadataResult = metadataResponse.data;
            let metadataBlobId: string;
            if (metadataResult.newlyCreated) {
                const blob = metadataResult.newlyCreated.blobObject;
                metadataBlobId = blob.blobId;
            } else if (metadataResult.alreadyCertified) {
                metadataBlobId = metadataResult.alreadyCertified.blobId;
            } else {
                throw new Error('Unexpected metadata upload response format');
            }

            const metadataUri = `${AGGREGATOR}/v1/blobs/${metadataBlobId}`;
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

    // Upload gallery metadata to Walrus using HTTP API
    const uploadGalleryToWalrus = async (
        galleryId: string,
        title: string,
        description: string,
        mediaUris: GalleryMedia[],
        owner: string,
        visibility: 'public' | 'private',
        chain: 'sui',
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

            // Upload gallery metadata to Walrus using HTTP API
            const galleryBlob = new Blob([JSON.stringify(galleryMetadata, null, 2)], {
                type: 'application/json',
            });
            const galleryFile = new File([galleryBlob], `${galleryId}-metadata.json`, {
                type: 'application/json',
            });

            const galleryResponse = await axios.put(
                `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
                galleryFile,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const galleryResult = galleryResponse.data;
            let galleryBlobId: string;
            if (galleryResult.newlyCreated) {
                const blob = galleryResult.newlyCreated.blobObject;
                galleryBlobId = blob.blobId;
            } else if (galleryResult.alreadyCertified) {
                galleryBlobId = galleryResult.alreadyCertified.blobId;
            } else {
                throw new Error('Unexpected gallery upload response format');
            }

            const galleryUri = `${AGGREGATOR}/v1/blobs/${galleryBlobId}`;

            console.log('Gallery created and stored in Walrus:', {
                galleryId,
                title,
                mediaCount: mediaUris.length,
                visibility,
                galleryUri,
            });

            // Return a mock transaction hash since HTTP API doesn't return one
            // In a real implementation, you might want to track this differently
            return {
                galleryUri,
                transactionHash: `walrus-${galleryBlobId.slice(0, 16)}`,
            };
        } catch (error) {
            console.error('Error creating gallery in Walrus:', error);
            throw new Error(`Failed to create gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Update existing gallery with new media
    const updateGalleryInWalrus = async (
        galleryUri: string,
        newMediaUris: GalleryMedia[]
    ): Promise<{
        galleryUri: string;
        transactionHash: string;
    }> => {
        try {
            // Step 1: Fetch existing gallery metadata using HTTP API
            const blobId = galleryUri.replace(`${AGGREGATOR}/v1/blobs/`, '').replace('https://blob.walrus.testnet.space/', '');
            const galleryResponse = await axios.get(`${AGGREGATOR}/v1/blobs/${blobId}`);
            const existingGallery = galleryResponse.data;

            // Step 2: Merge new media with existing media
            const updatedMediaUris = [
                ...(existingGallery.mediaUris || []),
                ...newMediaUris,
            ];

            // Step 3: Update gallery metadata
            const updatedGalleryMetadata = {
                ...existingGallery,
                mediaUris: updatedMediaUris,
                mediaCount: updatedMediaUris.length,
                updatedAt: new Date().toISOString(),
            };

            // Step 4: Upload updated gallery metadata to Walrus using HTTP API
            const updatedGalleryBlob = new Blob([JSON.stringify(updatedGalleryMetadata, null, 2)], {
                type: 'application/json',
            });
            const updatedGalleryFile = new File([updatedGalleryBlob], `${existingGallery.galleryId}-metadata.json`, {
                type: 'application/json',
            });

            const updatedGalleryResponse = await axios.put(
                `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
                updatedGalleryFile,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const updatedGalleryResult = updatedGalleryResponse.data;
            let updatedGalleryBlobId: string;
            if (updatedGalleryResult.newlyCreated) {
                const blob = updatedGalleryResult.newlyCreated.blobObject;
                updatedGalleryBlobId = blob.blobId;
            } else if (updatedGalleryResult.alreadyCertified) {
                updatedGalleryBlobId = updatedGalleryResult.alreadyCertified.blobId;
            } else {
                throw new Error('Unexpected updated gallery upload response format');
            }

            const updatedGalleryUri = `${AGGREGATOR}/v1/blobs/${updatedGalleryBlobId}`;

            console.log('Gallery updated in Walrus:', {
                galleryId: existingGallery.galleryId,
                newMediaCount: newMediaUris.length,
                totalMediaCount: updatedMediaUris.length,
                updatedGalleryUri,
            });

            return {
                galleryUri: updatedGalleryUri,
                transactionHash: `walrus-${updatedGalleryBlobId.slice(0, 16)}`,
            };
        } catch (error) {
            console.error('Error updating gallery in Walrus:', error);
            throw new Error(`Failed to update gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Delete media from existing gallery
    const deleteMediaFromGallery = async (
        galleryUri: string,
        mediaIndexToDelete: number
    ): Promise<{
        galleryUri: string;
        transactionHash: string;
    }> => {
        try {
            // Step 1: Fetch existing gallery metadata
            const blobId = galleryUri.replace(`${AGGREGATOR}/v1/blobs/`, '').replace('https://blob.walrus.testnet.space/', '');
            const galleryResponse = await axios.get(`${AGGREGATOR}/v1/blobs/${blobId}`);
            const existingGallery = galleryResponse.data;

            // Step 2: Remove the media at the specified index
            const updatedMediaUris = [...(existingGallery.mediaUris || [])];
            if (mediaIndexToDelete >= 0 && mediaIndexToDelete < updatedMediaUris.length) {
                updatedMediaUris.splice(mediaIndexToDelete, 1);
            } else {
                throw new Error(`Invalid media index: ${mediaIndexToDelete}`);
            }

            // Step 3: Update gallery metadata
            const updatedGalleryMetadata = {
                ...existingGallery,
                mediaUris: updatedMediaUris,
                mediaCount: updatedMediaUris.length,
                updatedAt: new Date().toISOString(),
            };

            // Step 4: Upload updated gallery metadata to Walrus
            const updatedGalleryBlob = new Blob([JSON.stringify(updatedGalleryMetadata, null, 2)], {
                type: 'application/json',
            });
            const updatedGalleryFile = new File([updatedGalleryBlob], `${existingGallery.galleryId}-metadata.json`, {
                type: 'application/json',
            });

            const updatedGalleryResponse = await axios.put(
                `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
                updatedGalleryFile,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const updatedGalleryResult = updatedGalleryResponse.data;
            let updatedGalleryBlobId: string;
            if (updatedGalleryResult.newlyCreated) {
                const blob = updatedGalleryResult.newlyCreated.blobObject;
                updatedGalleryBlobId = blob.blobId;
            } else if (updatedGalleryResult.alreadyCertified) {
                updatedGalleryBlobId = updatedGalleryResult.alreadyCertified.blobId;
            } else {
                throw new Error('Unexpected updated gallery upload response format');
            }

            const updatedGalleryUri = `${AGGREGATOR}/v1/blobs/${updatedGalleryBlobId}`;

            console.log('Media deleted from gallery:', {
                galleryId: existingGallery.galleryId,
                deletedIndex: mediaIndexToDelete,
                newMediaCount: updatedMediaUris.length,
                updatedGalleryUri,
            });

            return {
                galleryUri: updatedGalleryUri,
                transactionHash: `walrus-${updatedGalleryBlobId.slice(0, 16)}`,
            };
        } catch (error) {
            console.error('Error deleting media from gallery:', error);
            throw new Error(`Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return {
        uploadMediaToWalrus,
        uploadGalleryToWalrus,
        updateGalleryInWalrus,
        deleteMediaFromGallery,
    };
};
