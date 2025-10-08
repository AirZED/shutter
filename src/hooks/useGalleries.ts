import { useState, useEffect } from 'react';
import { walrusClient } from '@/lib/walrus';

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
  chain?: 'solana' | 'sui';
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

export const useGalleries = () => {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, you would:
      // 1. Query a registry of gallery URIs
      // 2. Or use Walrus tags to search for galleries
      // 3. Or maintain an index of gallery metadata

      // For now, we'll use mock data but structure it to match the real format
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
        {
          id: "2",
          title: "Exclusive Solana NFT Gallery",
          description: "Premium digital art collection accessible only to verified Solana NFT holders",
          thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop",
          mediaCount: 8,
          isLocked: true,
          requiredNFT: "0x1234567890abcdef1234567890abcdef12345678",
          chain: 'solana',
          participantCount: 15,
          owner: "0x456...",
          visibility: 'private',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          galleryUri: "https://blob.walrus.testnet.space/mock-gallery-2",
          mediaUris: [],
        },
        {
          id: "3",
          title: "Product Showcase & Demos",
          description: "Professional product photography and demonstration videos",
          thumbnail: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop",
          mediaCount: 18,
          isLocked: false,
          participantCount: 42,
          owner: "0x789...",
          visibility: 'public',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          galleryUri: "https://blob.walrus.testnet.space/mock-gallery-3",
          mediaUris: [],
        },
        {
          id: "4",
          title: "VIP Sui NFT Members",
          description: "Exclusive content for Sui NFT holders with specific traits",
          thumbnail: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop",
          mediaCount: 25,
          isLocked: true,
          requiredNFT: "0xabcdef1234567890abcdef1234567890abcdef12",
          requiredTraits: {
            "Rarity": "Legendary",
            "Level": "10"
          },
          chain: 'sui',
          participantCount: 8,
          owner: "0xabc...",
          visibility: 'private',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          galleryUri: "https://blob.walrus.testnet.space/mock-gallery-4",
          mediaUris: [],
        },
      ];

      setGalleries(mockGalleries);
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
  }, []);

  return {
    galleries,
    loading,
    error,
    fetchGalleries,
    fetchGalleryById,
    fetchGalleryFromWalrus,
  };
};
