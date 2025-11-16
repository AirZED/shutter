import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { GalleryChatPanel } from "@/components/GalleryChatPanel";
import { UploadModal } from "@/components/UploadModal";
import { MintNFTPrompt } from "@/components/MintNFTPrompt";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Loader2, Trash2, Plus, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGalleries, Gallery } from "@/hooks/useGalleries";
import { useWallet } from "@/contexts/WalletContext";
import { useWalrusUpload } from "@/hooks/useWalrusUpload";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import axios from "axios";

const GalleryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showMintPrompt, setShowMintPrompt] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { connection, verifyNFT } = useWallet();
  const { galleries, fetchGalleryById, fetchGalleryFromWalrus, fetchGalleries } = useGalleries(connection?.address);
  const { deleteMediaFromGallery, updateGalleryInWalrus } = useWalrusUpload();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const account = useCurrentAccount();
  const isWalletConnected = connection?.isConnected || false;

  useEffect(() => {
    const loadGallery = async () => {
      if (!id) {
        setLoading(false);
        setGallery(null);
        return;
      }

      // Only show loading state if we don't have this gallery already
      // This prevents flashing when galleries list updates
      const isNewGallery = !gallery || gallery.id !== id;
      if (isNewGallery) {
        setLoading(true);
      }

      try {
        const isNewGalleryCheck = isNewGallery; // Capture for use in catch block
        let foundGallery: Gallery | null = null;

        // Strategy 1: Try fetching directly from chain first (fastest, doesn't depend on galleries list)
        try {
          const suiClient = new SuiClient({
            url: getFullnodeUrl('testnet'),
          });

          try {
            const galleryObj = await suiClient.getObject({
              id: id,
              options: {
                showContent: true,
                showType: true,
              },
            });

            if (galleryObj.data?.content && 'fields' in galleryObj.data.content) {
              const fields = galleryObj.data.content.fields as any;
              const galleryType = `${GALLERY_NFT_PACKAGEID}::gallery_nft::Gallery`;

              if (galleryObj.data.type === galleryType) {
                // Fetch full gallery metadata from Walrus if gallery_uri exists
                let fullGalleryData: any = null;
                if (fields.gallery_uri) {
                  try {
                    const galleryResponse = await axios.get(fields.gallery_uri);
                    fullGalleryData = galleryResponse.data;
                  } catch (err) {
                    console.error('Error fetching gallery metadata:', err);
                  }
                }

                foundGallery = {
                  id: fields.gallery_id || id,
                  title: fields.title || 'Untitled Gallery',
                  description: fields.description || '',
                  thumbnail: fields.thumbnail || '',
                  mediaCount: Number(fields.media_count) || 0,
                  isLocked: fields.is_locked || false,
                  participantCount: fullGalleryData?.participantCount || 0,
                  requiredNFT: fields.required_nft || fullGalleryData?.requiredNFT,
                  requiredTraits: fullGalleryData?.requiredTraits,
                  chain: 'sui',
                  owner: fields.owner || connection?.address || '',
                  visibility: fields.visibility || 'public',
                  createdAt: new Date(Number(fields.created_at) * 1000).toISOString(),
                  updatedAt: new Date(Number(fields.updated_at) * 1000).toISOString(),
                  galleryUri: fields.gallery_uri || '',
                  mediaUris: fullGalleryData?.mediaUris || [],
                };
              }
            }
          } catch (err) {
            // Not a valid object ID - that's okay, try galleries list next
            console.log('Gallery ID is not a direct object ID, checking galleries list...');
          }
        } catch (error) {
          console.error('Error fetching gallery from chain:', error);
        }

        // Strategy 2: Check galleries list (might be faster if already loaded)
        if (!foundGallery) {
          foundGallery = galleries.find(g => g.id === id) || null;
        }

        // Update gallery state
        if (foundGallery) {
          setGallery(foundGallery);
          setLoading(false);
        } else if (isNewGallery) {
          // Only show "Not Found" if this is a new gallery load (not an update)
          // This prevents showing "Not Found" while galleries list is still loading
          setGallery(null);
          setLoading(false);
        } else {
          // If we already have a gallery but didn't find it in this check,
          // it might be that galleries list is still loading, so keep current gallery
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading gallery:', error);
        toast({
          title: "Error",
          description: "Failed to load gallery",
          variant: "destructive",
        });
        if (isNewGalleryCheck) {
          setGallery(null);
        }
        setLoading(false);
      }
    };

    loadGallery();
  }, [id, galleries, connection?.address]);

  // Check NFT access when gallery loads (only for media viewing, not gallery viewing)
  // Galleries are always visible - NFT is only required for viewing media
  useEffect(() => {
    const checkAccess = async () => {
      if (!gallery) {
        setHasAccess(null);
        return;
      }

      // If gallery is not locked, user has access to media
      if (!gallery.isLocked && !gallery.requiredNFT) {
        setHasAccess(true);
        return;
      }

      // If user is the owner, they have access
      const isOwner = connection?.address?.toLowerCase() === gallery.owner?.toLowerCase();
      if (isOwner) {
        setHasAccess(true);
        return;
      }

      // Only check NFT access if wallet is connected
      if (!isWalletConnected) {
        setHasAccess(null); // Will prompt to connect wallet when trying to view media
        return;
      }

      // Check NFT access for media viewing
      setCheckingAccess(true);
      try {
        const hasNFT = await verifyNFT(
          gallery.requiredNFT || GALLERY_NFT_PACKAGEID,
          gallery.requiredTraits
        );
        setHasAccess(hasNFT);
        // Don't show mint prompt automatically - let them see the gallery first
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [gallery, isWalletConnected, connection?.address, verifyNFT]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Gallery Not Found</h1>
          <p className="text-muted-foreground mb-4">The gallery you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Convert gallery mediaUris to media format for display
  const galleryMedia = gallery.mediaUris?.map((media, index) => ({
    id: `${gallery.id}-media-${index}`,
    title: media.name || `Media ${index + 1}`,
    type: media.type,
    thumbnail: media.uri,
    uri: media.uri,
    isLocked: gallery.isLocked || false,
    requiredNFT: gallery.requiredNFT,
  })) || [];

  const handleMediaClick = async (media: any) => {
    // If user is the gallery owner, they always have access
    const isOwner = connection?.address?.toLowerCase() === gallery.owner?.toLowerCase();

    // Check if media requires NFT access (gallery is locked or has required NFT)
    const requiresNFT = gallery.isLocked || gallery.requiredNFT;

    if (requiresNFT && !isOwner) {
      // If wallet not connected, show mint prompt (which will prompt to connect wallet)
      if (!isWalletConnected) {
        setShowMintPrompt(true);
        toast({
          title: "NFT Required",
          description: "Please connect your wallet to mint an access pass NFT.",
          variant: "default",
        });
        return;
      }

      // Verify NFT access
      try {
        const hasAccess = await verifyNFT(
          gallery.requiredNFT || GALLERY_NFT_PACKAGEID,
          gallery.requiredTraits
        );

        if (!hasAccess) {
          // Show mint prompt - user doesn't have the required NFT
          setShowMintPrompt(true);
          // Store the media they tried to access so we can open it after minting
          setSelectedMedia(media);
          toast({
            title: "NFT Required",
            description: "You need an NFT to view this media. Would you like to mint an access pass?",
            variant: "default",
          });
          return;
        }
      } catch (error) {
        console.error("Error verifying NFT access:", error);
        // On error, still show mint prompt as a fallback
        setShowMintPrompt(true);
        setSelectedMedia(media);
        toast({
          title: "Verification Error",
          description: "Failed to verify your access. You can mint an access pass to view this media.",
          variant: "default",
        });
        return;
      }
    }

    // User has access (either no NFT required, is owner, or has NFT)
    setSelectedMedia(media);
  };

  const isMediaAccessible = (media: any) => {
    return !gallery.isLocked || isWalletConnected;
  };

  // Check if user is the gallery owner
  const isOwner = connection?.address?.toLowerCase() === gallery.owner?.toLowerCase();

  // Update on-chain Gallery object
  const updateOnChainGallery = async (newMediaCount: number, newGalleryUri: string) => {
    if (!gallery || !account) return;

    try {
      // Find the Gallery object ID (it's the gallery.id if it's an object ID)
      const galleryObjectId = gallery.id;

      const txb = new Transaction();
      txb.moveCall({
        target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::update_gallery`,
        arguments: [
          txb.object(galleryObjectId), // Gallery object
          txb.pure.string(gallery.title),
          txb.pure.string(gallery.description),
          txb.pure.u64(newMediaCount),
          txb.pure.string(newGalleryUri),
        ],
      });

      await signAndExecuteTransaction({
        transaction: txb,
      });

      console.log('✅ On-chain gallery updated successfully');
    } catch (error) {
      console.error('Error updating on-chain gallery:', error);
      // Don't throw - Walrus update succeeded, on-chain update is optional
    }
  };

  // Handle delete media
  const handleDeleteMedia = async (mediaIndex: number) => {
    if (!gallery || !isOwner) return;

    if (!confirm(`Are you sure you want to delete this media item?`)) {
      return;
    }

    setIsDeleting(mediaIndex);
    try {
      // Delete from Walrus
      const { galleryUri: newGalleryUri } = await deleteMediaFromGallery(
        gallery.galleryUri,
        mediaIndex
      );

      // Update on-chain Gallery object
      const newMediaCount = (gallery.mediaUris?.length || 0) - 1;
      await updateOnChainGallery(newMediaCount, newGalleryUri);

      // Refresh gallery data
      await fetchGalleries();

      // Reload the gallery
      const suiClient = new SuiClient({
        url: getFullnodeUrl('testnet'),
      });

      try {
        const galleryObj = await suiClient.getObject({
          id: gallery.id,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (galleryObj.data?.content && 'fields' in galleryObj.data.content) {
          const fields = galleryObj.data.content.fields as any;
          const galleryType = `${GALLERY_NFT_PACKAGEID}::gallery_nft::Gallery`;

          if (galleryObj.data.type === galleryType) {
            let fullGalleryData: any = null;
            if (fields.gallery_uri) {
              try {
                const galleryResponse = await axios.get(fields.gallery_uri);
                fullGalleryData = galleryResponse.data;
              } catch (err) {
                console.error('Error fetching gallery metadata:', err);
              }
            }

            const updatedGallery: Gallery = {
              id: fields.gallery_id || gallery.id,
              title: fields.title || 'Untitled Gallery',
              description: fields.description || '',
              thumbnail: fields.thumbnail || '',
              mediaCount: Number(fields.media_count) || 0,
              isLocked: fields.is_locked || false,
              participantCount: fullGalleryData?.participantCount || 0,
              requiredNFT: fields.required_nft || fullGalleryData?.requiredNFT,
              requiredTraits: fullGalleryData?.requiredTraits,
              chain: 'sui',
              owner: fields.owner || connection?.address || '',
              visibility: fields.visibility || 'public',
              createdAt: new Date(Number(fields.created_at) * 1000).toISOString(),
              updatedAt: new Date(Number(fields.updated_at) * 1000).toISOString(),
              galleryUri: fields.gallery_uri || '',
              mediaUris: fullGalleryData?.mediaUris || [],
            };

            setGallery(updatedGallery);
          }
        }
      } catch (err) {
        console.error('Error reloading gallery:', err);
      }

      toast({
        title: "Media Deleted",
        description: "Media item has been removed from the gallery",
      });
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete media",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle add media (refresh after upload modal closes)
  const handleUploadComplete = async () => {
    if (!gallery) return;

    // Wait a moment for on-chain updates to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Refresh gallery data
    await fetchGalleries();

    // Reload the current gallery from chain
    const suiClient = new SuiClient({
      url: getFullnodeUrl('testnet'),
    });

    try {
      // Try fetching the gallery object multiple times with retries
      let galleryObj = null;
      let retries = 3;

      while (retries > 0) {
        try {
          galleryObj = await suiClient.getObject({
            id: gallery.id,
            options: {
              showContent: true,
              showType: true,
            },
          });
          break;
        } catch (err) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (galleryObj?.data?.content && 'fields' in galleryObj.data.content) {
        const fields = galleryObj.data.content.fields as any;
        const galleryType = `${GALLERY_NFT_PACKAGEID}::gallery_nft::Gallery`;

        if (galleryObj.data.type === galleryType) {
          // Fetch full gallery metadata from Walrus using the updated URI
          let fullGalleryData: any = null;
          const galleryUri = fields.gallery_uri || gallery.galleryUri;

          if (galleryUri) {
            try {
              // Try fetching with cache busting
              const galleryResponse = await axios.get(galleryUri, {
                params: { _t: Date.now() }, // Cache bust
                headers: {
                  'Cache-Control': 'no-cache',
                },
              });
              fullGalleryData = galleryResponse.data;
              console.log('✅ Fetched updated gallery data:', fullGalleryData);
            } catch (err) {
              console.error('Error fetching gallery metadata from URI:', galleryUri, err);
              // Try the old URI as fallback
              if (galleryUri !== gallery.galleryUri && gallery.galleryUri) {
                try {
                  const fallbackResponse = await axios.get(gallery.galleryUri, {
                    params: { _t: Date.now() },
                  });
                  fullGalleryData = fallbackResponse.data;
                  console.log('✅ Fetched from fallback URI');
                } catch (fallbackErr) {
                  console.error('Error fetching from fallback URI:', fallbackErr);
                }
              }
            }
          }

          const updatedGallery: Gallery = {
            id: fields.gallery_id || gallery.id,
            title: fields.title || 'Untitled Gallery',
            description: fields.description || '',
            thumbnail: fields.thumbnail || '',
            mediaCount: Number(fields.media_count) || 0,
            isLocked: fields.is_locked || false,
            participantCount: fullGalleryData?.participantCount || 0,
            requiredNFT: fields.required_nft || fullGalleryData?.requiredNFT,
            requiredTraits: fullGalleryData?.requiredTraits,
            chain: 'sui',
            owner: fields.owner || connection?.address || '',
            visibility: fields.visibility || 'public',
            createdAt: new Date(Number(fields.created_at) * 1000).toISOString(),
            updatedAt: new Date(Number(fields.updated_at) * 1000).toISOString(),
            galleryUri: fields.gallery_uri || gallery.galleryUri || '',
            mediaUris: fullGalleryData?.mediaUris || gallery.mediaUris || [],
          };

          console.log('🔄 Updating gallery with:', {
            mediaCount: updatedGallery.mediaCount,
            mediaUrisCount: updatedGallery.mediaUris?.length,
            galleryUri: updatedGallery.galleryUri,
          });

          setGallery(updatedGallery);

          toast({
            title: "Gallery Refreshed",
            description: `Gallery updated with ${updatedGallery.mediaUris?.length || 0} media items`,
          });
        }
      }
    } catch (err) {
      console.error('Error reloading gallery:', err);
      toast({
        title: "Refresh Warning",
        description: "Gallery may have been updated. Please refresh the page.",
        variant: "default",
      });
    }
  };

  // Galleries are always accessible for viewing (public by default)
  // NFT is only required for viewing media, not for viewing the gallery itself
  const isGalleryAccessible = true; // Always allow viewing gallery details

  // Show loading state while checking access (only briefly)
  if (checkingAccess && gallery.isLocked) {
    // Don't block - just show a brief loading indicator
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        onUploadClick={() => navigate("/create")}
      />
      <main className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate("/")} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Galleries
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{gallery.title}</h1>
                <p className="text-muted-foreground">{gallery.description}</p>
              </div>
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadComplete}
                  className="ml-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              )}
            </div>

            {/* Show NFT requirement notice if gallery is locked */}
            {(gallery.isLocked || gallery.requiredNFT) && !isOwner && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      NFT Required to View Media
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      This gallery is public, but viewing media requires an NFT. {!isWalletConnected && "Connect your wallet to check access or mint an access pass."}
                    </p>
                    {isWalletConnected && hasAccess === false && (
                      <Button
                        onClick={() => setShowMintPrompt(true)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="mr-2 h-3 w-3" />
                        Mint Access Pass
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {galleryMedia.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {galleryMedia.map((media, index) => {
                  // Media is locked if gallery requires NFT and user doesn't have access
                  const mediaIsLocked = (gallery.isLocked || gallery.requiredNFT) && !isOwner && hasAccess !== true;

                  return (
                    <div key={media.id} className="group relative">
                      <MediaCard
                        title={media.title}
                        type={media.type}
                        thumbnail={media.thumbnail}
                        isLocked={mediaIsLocked}
                        requiredNFT={gallery.requiredNFT}
                        onClick={() => handleMediaClick(media)}
                      />
                      {isOwner && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMedia(index);
                          }}
                          disabled={isDeleting === index}
                        >
                          {isDeleting === index ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No media in this gallery yet.</p>
                {isOwner && (
                  <Button onClick={() => setIsUploadOpen(true)} variant="gradient">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Media
                  </Button>
                )}
              </div>
            )}

            {isOwner && galleryMedia.length > 0 && (
              <div className="mt-6">
                <Button onClick={() => setIsUploadOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add More Media
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 h-[calc(100vh-8rem)]">
              <GalleryChatPanel />
            </div>
          </div>
        </div>
      </main>

      <UploadModal
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (!open) {
            // Refresh gallery when modal closes (with delay to allow updates to propagate)
            setTimeout(() => {
              handleUploadComplete();
            }, 1000);
          }
        }}
        defaultGalleryId={gallery?.id}
        onGalleryUpdated={async (galleryId, newGalleryUri) => {
          // Immediately refresh using the new URI
          if (gallery && gallery.id === galleryId) {
            try {
              // Fetch updated gallery data directly from the new URI
              const galleryResponse = await axios.get(newGalleryUri, {
                params: { _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache' },
              });
              const fullGalleryData = galleryResponse.data;

              // Update gallery state immediately
              const updatedGallery: Gallery = {
                ...gallery,
                galleryUri: newGalleryUri,
                mediaCount: fullGalleryData.mediaUris?.length || 0,
                mediaUris: fullGalleryData.mediaUris || [],
                updatedAt: new Date().toISOString(),
              };

              setGallery(updatedGallery);
              console.log('✅ Gallery updated immediately with new media:', updatedGallery.mediaUris?.length);
            } catch (err) {
              console.error('Error fetching updated gallery:', err);
            }
          }
        }}
      />

      <MediaDetailModal
        open={!!selectedMedia}
        onOpenChange={(open) => !open && setSelectedMedia(null)}
        media={selectedMedia}
        isAccessible={selectedMedia ? (isOwner || !gallery.isLocked || hasAccess === true) : false}
      />

      {/* Mint Prompt Modal - shown when user tries to access locked media without NFT */}
      {showMintPrompt && gallery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Mint Access Pass</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMintPrompt(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <MintNFTPrompt
                galleryTitle={gallery.title}
                requiredNFT={gallery.requiredNFT}
                onMintSuccess={async () => {
                  // Re-check access after minting
                  try {
                    const hasNFT = await verifyNFT(
                      gallery.requiredNFT || GALLERY_NFT_PACKAGEID,
                      gallery.requiredTraits
                    );
                    setHasAccess(hasNFT);
                    setShowMintPrompt(false);
                    if (hasNFT) {
                      toast({
                        title: "Access Granted!",
                        description: "Your NFT has been verified. You can now view the media.",
                      });
                      // Retry opening the media
                      if (selectedMedia) {
                        setSelectedMedia(null);
                        setTimeout(() => {
                          handleMediaClick(selectedMedia);
                        }, 500);
                      }
                    }
                  } catch (error) {
                    console.error("Error verifying access after mint:", error);
                  }
                }}
                onCancel={() => {
                  setShowMintPrompt(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDetail;
