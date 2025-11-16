import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { GalleryChatPanel } from "@/components/GalleryChatPanel";
import { UploadModal } from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGalleries, Gallery } from "@/hooks/useGalleries";
import { useWallet } from "@/contexts/WalletContext";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";

const GalleryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const { connection, verifyNFT } = useWallet();
  const { galleries, fetchGalleryById, fetchGalleryFromWalrus } = useGalleries();
  const isWalletConnected = connection?.isConnected || false;

  useEffect(() => {
    const loadGallery = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // First, try to find in the galleries list
        let foundGallery = galleries.find(g => g.id === id);

        // If not found, try localStorage
        if (!foundGallery) {
          const userGalleries = JSON.parse(localStorage.getItem('userGalleries') || '[]');
          foundGallery = userGalleries.find((g: Gallery) => g.id === id);
        }

        // If still not found, try fetching from Walrus if we have a galleryUri
        if (!foundGallery) {
          // Try to fetch from Walrus using the ID pattern
          // For now, we'll check if it's a user gallery in localStorage
          const allUserGalleries = JSON.parse(localStorage.getItem('userGalleries') || '[]');
          foundGallery = allUserGalleries.find((g: Gallery) => g.id === id);

          // If we have a galleryUri, try fetching from Walrus
          if (!foundGallery && foundGallery?.galleryUri) {
            try {
              const walrusGallery = await fetchGalleryFromWalrus(foundGallery.galleryUri);
              if (walrusGallery) {
                foundGallery = walrusGallery;
              }
            } catch (error) {
              console.error('Error fetching from Walrus:', error);
            }
          }
        }

        // If still not found, try fetching from Walrus using HTTP API
        if (!foundGallery) {
          // Check if we can fetch from aggregator (for user-created galleries)
          // This is a fallback - in production you'd have a registry
          const userGalleries = JSON.parse(localStorage.getItem('userGalleries') || '[]');
          foundGallery = userGalleries.find((g: Gallery) => g.id === id);
        }

        setGallery(foundGallery || null);
      } catch (error) {
        console.error('Error loading gallery:', error);
        toast({
          title: "Error",
          description: "Failed to load gallery",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
  }, [id, galleries]);

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
    if (gallery.isLocked && !isWalletConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to access this content",
        variant: "destructive",
      });
      return;
    }

    // If user is the gallery owner, they always have access
    const isOwner = connection?.address?.toLowerCase() === gallery.owner?.toLowerCase();

    // Verify NFT access if gallery is locked and user is not the owner
    if (gallery.isLocked && isWalletConnected && !isOwner) {
      try {
        // Check for NFTs from the gallery_nft package
        const hasAccess = await verifyNFT(gallery.requiredNFT || GALLERY_NFT_PACKAGEID, gallery.requiredTraits);
        if (!hasAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have the required NFT to access this gallery.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("Error verifying NFT access:", error);
        toast({
          title: "Verification Error",
          description: "Failed to verify your access. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedMedia(media);
  };

  const isMediaAccessible = (media: any) => {
    return !gallery.isLocked || isWalletConnected;
  };

  // Check if user is the gallery owner
  const isOwner = connection?.address?.toLowerCase() === gallery.owner?.toLowerCase();

  // Gallery is accessible if: public, or user is owner, or user has connected wallet (will verify NFT on click)
  const isGalleryAccessible = !gallery.isLocked || isOwner || isWalletConnected;

  if (!isGalleryAccessible) {
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
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center glass-card p-8 rounded-lg border border-locked/20">
              <Lock className="h-16 w-16 mx-auto mb-4 text-locked" />
              <h2 className="text-2xl font-bold mb-2">Gallery Locked</h2>
              <p className="text-muted-foreground mb-4">
                This gallery requires <span className="text-locked font-semibold">{gallery.requiredNFT || "specific NFT"}</span> to access
              </p>
              <Button onClick={() => navigate("/")} variant="gradient">
                Back to Galleries
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
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
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{gallery.title}</h1>
              <p className="text-muted-foreground">{gallery.description}</p>
            </div>

            {galleryMedia.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {galleryMedia.map((media) => (
                  <MediaCard
                    key={media.id}
                    title={media.title}
                    type={media.type}
                    thumbnail={media.thumbnail}
                    isLocked={media.isLocked}
                    requiredNFT={media.requiredNFT}
                    onClick={() => handleMediaClick(media)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No media in this gallery yet.</p>
                <Button onClick={() => setIsUploadOpen(true)} variant="gradient">
                  Add Media
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

      <UploadModal open={isUploadOpen} onOpenChange={setIsUploadOpen} />

      <MediaDetailModal
        open={!!selectedMedia}
        onOpenChange={(open) => !open && setSelectedMedia(null)}
        media={selectedMedia}
        isAccessible={selectedMedia ? isMediaAccessible(selectedMedia) : false}
      />
    </div>
  );
};

export default GalleryDetail;
