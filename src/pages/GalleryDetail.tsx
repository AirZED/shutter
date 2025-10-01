import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MediaCard } from "@/components/MediaCard";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { GalleryChatPanel } from "@/components/GalleryChatPanel";
import { UploadModal } from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock gallery data
const mockGalleries = {
  "1": {
    id: "1",
    title: "Sunset Photography Collection",
    description: "A curated collection of breathtaking sunset photographs from around the world. Each image captures the unique beauty of golden hour.",
    isLocked: false,
    media: [
      {
        id: "1",
        title: "Golden Beach Sunset",
        type: "image" as const,
        thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        isLocked: false,
      },
      {
        id: "2",
        title: "Mountain Twilight",
        type: "image" as const,
        thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop",
        isLocked: false,
      },
      {
        id: "3",
        title: "Ocean Horizon",
        type: "image" as const,
        thumbnail: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=400&fit=crop",
        isLocked: false,
      },
    ],
  },
  "2": {
    id: "2",
    title: "Exclusive NFT Art Gallery",
    description: "Premium digital art collection accessible only to verified NFT holders. Features rare pieces from top crypto artists.",
    isLocked: true,
    requiredNFT: "CryptoPunks",
    media: [
      {
        id: "4",
        title: "Exclusive Art Piece #42",
        type: "image" as const,
        thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop",
        isLocked: true,
        requiredNFT: "CryptoPunks",
      },
      {
        id: "5",
        title: "Digital Dreams",
        type: "image" as const,
        thumbnail: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop",
        isLocked: true,
        requiredNFT: "CryptoPunks",
      },
    ],
  },
  "3": {
    id: "3",
    title: "Product Showcase & Demos",
    description: "Professional product photography and demonstration videos. Perfect for e-commerce and marketing materials.",
    isLocked: false,
    media: [
      {
        id: "6",
        title: "Product Demo Video",
        type: "video" as const,
        thumbnail: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop",
        isLocked: false,
      },
      {
        id: "7",
        title: "Studio Product Shots",
        type: "image" as const,
        thumbnail: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
        isLocked: false,
      },
    ],
  },
};

const GalleryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const gallery = mockGalleries[id as keyof typeof mockGalleries];

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Gallery Not Found</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleConnectWallet = () => {
    if (!isWalletConnected) {
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to MetaMask",
      });
      setIsWalletConnected(true);
    }
  };

  const handleMediaClick = (media: any) => {
    if (media.isLocked && !isWalletConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to access this content",
        variant: "destructive",
      });
      return;
    }
    setSelectedMedia(media);
  };

  const isMediaAccessible = (media: any) => {
    return !media.isLocked || isWalletConnected;
  };

  const isGalleryAccessible = !gallery.isLocked || isWalletConnected;

  if (!isGalleryAccessible) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onUploadClick={() => setIsUploadOpen(true)}
          onConnectWallet={handleConnectWallet}
          isWalletConnected={isWalletConnected}
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
                This gallery requires <span className="text-locked font-semibold">{"requiredNFT" in gallery ? gallery.requiredNFT : "specific NFT"}</span> to access
              </p>
              <Button onClick={handleConnectWallet} variant="gradient">
                Connect Wallet to Access
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
        onUploadClick={() => setIsUploadOpen(true)}
        onConnectWallet={handleConnectWallet}
        isWalletConnected={isWalletConnected}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {gallery.media.map((media) => (
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
