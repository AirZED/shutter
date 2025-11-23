import { useState, useEffect } from 'react';
import { walrusClient } from '@/lib/walrus';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { GALLERY_NFT_PACKAGEID } from '@/lib/constants';
import axios from 'axios';

export interface Gallery {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  mediaCount: number;
  isLocked: boolean;
  participantCount: number;
  requiredNFT?: string;
  requiredTraits?: Record<string, string>;
  chain?: 'sui';
  owner: string;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
  galleryUri: string;
  mediaUris: Array<{
    name: string;
    uri: string;
    type: 'image' | 'video' | 'audio';
  }>;
}

export const useGalleries = (userAddress?: string | null) => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const suiClient = new SuiClient({
    url: getFullnodeUrl('testnet'),
  });

  const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

  // Fetch galleries from on-chain Gallery objects
  const fetchGalleriesFromChain = async (address: string): Promise<Gallery[]> => {
    try {
      const onChainGalleries: Gallery[] = [];

      // Query all owned objects for Gallery type
      const packageId = GALLERY_NFT_PACKAGEID;
      const galleryType = `${packageId}::gallery_nft::Gallery`;

      let cursor: string | null = null;
      let hasNextPage = true;

      while (hasNextPage) {
        const ownedObjects = await suiClient.getOwnedObjects({
          owner: address,
          filter: {
            StructType: galleryType,
          },
          options: {
            showContent: true,
            showType: true,
          },
          cursor: cursor || undefined,
          limit: 50,
        });

        // Process each Gallery object
        for (const obj of ownedObjects.data) {
          if (obj.data?.content && 'fields' in obj.data.content) {
            const fields = obj.data.content.fields as any;

            // Fetch full gallery metadata from Walrus if gallery_uri exists
            let fullGalleryData: any = null;
            if (fields.gallery_uri) {
              try {
                const galleryResponse = await axios.get(fields.gallery_uri);
                fullGalleryData = galleryResponse.data;
              } catch (err) {
                console.error('Error fetching gallery metadata from URI:', fields.gallery_uri, err);
              }
            }

            onChainGalleries.push({
              id: fields.gallery_id || obj.data.objectId,
              title: fields.title || 'Untitled Gallery',
              description: fields.description || '',
              thumbnail: fields.thumbnail || '',
              mediaCount: Number(fields.media_count) || 0,
              isLocked: fields.is_locked || false,
              participantCount: fullGalleryData?.participantCount || 0,
              requiredNFT: fields.required_nft || fullGalleryData?.requiredNFT,
              requiredTraits: fullGalleryData?.requiredTraits,
              chain: 'sui',
              owner: address,
              visibility: fields.visibility || 'public',
              createdAt: new Date(Number(fields.created_at) * 1000).toISOString(),
              updatedAt: new Date(Number(fields.updated_at) * 1000).toISOString(),
              galleryUri: fields.gallery_uri || '',
              mediaUris: fullGalleryData?.mediaUris || [],
            });
          }
        }

        cursor = ownedObjects.nextCursor || null;
        hasNextPage = ownedObjects.hasNextPage;
      }

      return onChainGalleries;
    } catch (err) {
      console.error('Error fetching galleries from chain:', err);
      return [];
    }
  };

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      setError(null);

      const allGalleries: Gallery[] = [];

      // Fetch galleries from on-chain Gallery objects only (no localStorage)
      if (userAddress) {
        const chainGalleries = await fetchGalleriesFromChain(userAddress);
        allGalleries.push(...chainGalleries);
      }

      // Add mock galleries for demo (only if no user galleries found)
      if (allGalleries.length === 0) {
        const mockGalleries: Gallery[] = [
          {
            id: "1",
            title: "Sunset Photography Collection",
            description: "A curated collection of breathtaking sunset photographs from around the world",
            thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
            mediaCount: 12,
            isLocked: false,
            participantCount: 24,
            owner: "0x123...",
            visibility: 'public',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            galleryUri: "https://blob.walrus.testnet.space/mock-gallery-1",
            mediaUris: [],
          },
        ];
        allGalleries.push(...mockGalleries);
      }

      setGalleries(allGalleries);
    } catch (err) {
      console.error('Error fetching galleries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch galleries');
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryById = async (galleryId: string): Promise<Gallery | null> => {
    try {
      // In a real implementation, you would fetch from Walrus using the gallery URI
      // For now, return the gallery from the current list
      const gallery = galleries.find(g => g.id === galleryId);
      return gallery || null;
    } catch (err) {
      console.error('Error fetching gallery by ID:', err);
      return null;
    }
  };

  const fetchGalleryFromWalrus = async (galleryUri: string): Promise<Gallery | null> => {
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

      return galleryData as Gallery;
    } catch (err) {
      console.error('Error fetching gallery from Walrus:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, [userAddress]);

  return {
    galleries,
    loading,
    error,
    fetchGalleries,
    fetchGalleryById,
    fetchGalleryFromWalrus,
  };
};
