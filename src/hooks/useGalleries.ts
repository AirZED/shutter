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

  // Fetch ALL galleries from on-chain Gallery objects (public - visible to everyone)
  const fetchAllGalleriesFromChain = async (): Promise<Gallery[]> => {
    try {
      const onChainGalleries: Gallery[] = [];

      // Query all Gallery objects using RPC API (not just owned by user)
      const packageId = GALLERY_NFT_PACKAGEID;
      const galleryType = `${packageId}::gallery_nft::Gallery`;

      let cursor: string | null = null;
      let hasNextPage = true;

      while (hasNextPage) {
        // Use RPC API to query all objects of Gallery type
        const queryParams: any = {
          filter: {
            StructType: galleryType,
          },
          options: {
            showContent: true,
            showType: true,
            showOwner: true,
          },
          limit: 50,
        };

        if (cursor) {
          queryParams.cursor = cursor;
        }

        // Use RPC API directly to query all objects of Gallery type
        // Try multiple RPC methods as different endpoints may support different methods
        let queryResult: any;
        const rpcUrl = getFullnodeUrl('testnet');

        try {
          // Try suix_queryObjects first (most common)
          const response = await axios.post(rpcUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'suix_queryObjects',
            params: [queryParams],
          });

          if (response.data.error) {
            throw new Error(response.data.error.message || 'RPC error');
          }

          queryResult = response.data.result;
        } catch (rpcError: any) {
          console.warn('suix_queryObjects failed, trying alternative methods...', rpcError?.response?.data || rpcError?.message);

          // Fallback: Query transactions that called create_gallery to find gallery objects
          // This is a workaround when direct object querying isn't available
          try {
            const packageId = GALLERY_NFT_PACKAGEID;
            const txResponse = await axios.post(rpcUrl, {
              jsonrpc: '2.0',
              id: 2,
              method: 'suix_queryTransactionBlocks',
              params: [{
                filter: {
                  MoveFunction: {
                    package: packageId,
                    module: 'gallery_nft',
                    function: 'create_gallery',
                  },
                },
                options: {
                  showInput: false,
                  showEffects: true,
                  showEvents: false,
                  showObjectChanges: true,
                },
                limit: 50,
              }],
            });

            if (txResponse.data.error) {
              throw new Error(txResponse.data.error.message || 'Transaction query error');
            }

            const transactions = txResponse.data.result?.data || [];
            const galleryObjectIds: string[] = [];

            // Extract gallery object IDs from transaction object changes
            for (const tx of transactions) {
              if (tx.objectChanges) {
                for (const change of tx.objectChanges) {
                  // Look for created objects of type Gallery
                  if (change.type === 'created' && change.objectType?.includes('Gallery')) {
                    galleryObjectIds.push(change.objectId);
                  }
                }
              }
            }

            // Fetch each gallery object
            for (const galleryId of galleryObjectIds) {
              try {
                const galleryObj = await suiClient.getObject({
                  id: galleryId,
                  options: {
                    showContent: true,
                    showType: true,
                    showOwner: true,
                  },
                });

                if (galleryObj.data?.content && 'fields' in galleryObj.data.content) {
                  const fields = galleryObj.data.content.fields as any;
                  const owner = galleryObj.data.owner && typeof galleryObj.data.owner === 'object' && 'AddressOwner' in galleryObj.data.owner
                    ? galleryObj.data.owner.AddressOwner
                    : '';

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
                    id: fields.gallery_id || galleryId,
                    title: fields.title || 'Untitled Gallery',
                    description: fields.description || '',
                    thumbnail: fields.thumbnail || '',
                    mediaCount: Number(fields.media_count) || 0,
                    isLocked: fields.is_locked || false,
                    participantCount: fullGalleryData?.participantCount || 0,
                    requiredNFT: fields.required_nft || fullGalleryData?.requiredNFT,
                    requiredTraits: fullGalleryData?.requiredTraits,
                    chain: 'sui',
                    owner: owner || '',
                    visibility: fields.visibility || 'public',
                    createdAt: new Date(Number(fields.created_at) * 1000).toISOString(),
                    updatedAt: new Date(Number(fields.updated_at) * 1000).toISOString(),
                    galleryUri: fields.gallery_uri || '',
                    mediaUris: fullGalleryData?.mediaUris || [],
                  });
                }
              } catch (objError) {
                console.error(`Error fetching gallery object ${galleryId}:`, objError);
              }
            }

            // If we found galleries via transactions, return them
            if (onChainGalleries.length > 0) {
              return onChainGalleries;
            }
          } catch (eventError) {
            console.error('All query methods failed:', eventError);
            // If all methods fail, we can't fetch galleries without an indexer
            break;
          }
        }

        // Only process objects if queryResult was successfully obtained
        if (!queryResult) {
          // If we already got galleries from the fallback method, return them
          if (onChainGalleries.length > 0) {
            return onChainGalleries;
          }
          // Otherwise, break and return empty array
          break;
        }

        const objects = queryResult.data || queryResult.objects || [];

        // Process each Gallery object
        for (const obj of objects) {
          // Handle both RPC response format and SDK format
          const objData = obj.data || obj;

          if (objData?.content && 'fields' in objData.content) {
            const fields = objData.content.fields as any;

            // Get owner from object data
            let owner = '';
            if (objData.owner) {
              if (typeof objData.owner === 'string') {
                owner = objData.owner;
              } else if (typeof objData.owner === 'object' && 'AddressOwner' in objData.owner) {
                owner = objData.owner.AddressOwner;
              }
            }
            const objectId = objData.objectId || obj.objectId || '';

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
              id: fields.gallery_id || objectId,
              title: fields.title || 'Untitled Gallery',
              description: fields.description || '',
              thumbnail: fields.thumbnail || '',
              mediaCount: Number(fields.media_count) || 0,
              isLocked: fields.is_locked || false,
              participantCount: fullGalleryData?.participantCount || 0,
              requiredNFT: fields.required_nft || fullGalleryData?.requiredNFT,
              requiredTraits: fullGalleryData?.requiredTraits,
              chain: 'sui',
              owner: owner || '',
              visibility: fields.visibility || 'public',
              createdAt: new Date(Number(fields.created_at) * 1000).toISOString(),
              updatedAt: new Date(Number(fields.updated_at) * 1000).toISOString(),
              galleryUri: fields.gallery_uri || '',
              mediaUris: fullGalleryData?.mediaUris || [],
            });
          }
        }

        cursor = queryResult.nextCursor || null;
        hasNextPage = queryResult.hasNextPage || false;
      }

      return onChainGalleries;
    } catch (err) {
      console.error('Error fetching all galleries from chain:', err);
      return [];
    }
  };

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching all galleries from chain...');

      // Fetch ALL galleries from on-chain (public - visible to everyone)
      // Galleries are always public, NFT is only required for viewing media
      const allGalleries = await fetchAllGalleriesFromChain();

      console.log(`✅ Found ${allGalleries.length} galleries`);
      setGalleries(allGalleries);
    } catch (err) {
      console.error('❌ Error fetching galleries:', err);
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
    console.log('🔄 useGalleries: userAddress changed or component mounted, fetching galleries...', userAddress);
    fetchGalleries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
