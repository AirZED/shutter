import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { GalleryCard } from "@/components/GalleryCard";
import { UploadModal } from "@/components/UploadModal";
import { AIAssistant } from "@/components/AIAssistant";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useGalleries } from "@/hooks/useGalleries";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { connection, verifyNFT } = useWallet();
  const { galleries, loading, error, fetchGalleries } = useGalleries();
  const isConnected = connection?.isConnected || false;

  const { toast } = useToast();

  const handleGalleryClick = async (gallery: any) => {
    if (!gallery.isLocked) {
      navigate(`/gallery/${gallery.id}`);
      return;
    }

    if (!isConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to access this gallery",
        variant: "destructive",
      });
      return;
    }

    if (connection?.chain !== gallery.chain) {
      toast({
        title: "Wrong Chain",
        description: `This gallery requires a ${gallery.chain} wallet. Please switch to ${gallery.chain}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const hasAccess = await verifyNFT(gallery.requiredNFT, gallery.requiredTraits);
      if (hasAccess) {
        navigate(`/gallery/${gallery.id}`);
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have the required NFT to access this gallery.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying NFT access:", error);
      toast({
        title: "Verification Error",
        description: "Failed to verify your access. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onUploadClick={() => setIsUploadOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <HeroSection onGetStarted={() => setIsUploadOpen(true)} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Explore Galleries</h2>
            <p className="text-muted-foreground">
              Discover curated collections of media. Some galleries require specific NFTs to access.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchGalleries}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading galleries...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchGalleries} variant="outline">
              Try Again
            </Button>
          </div>
        ) : galleries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No galleries found</p>
            <Button onClick={() => setIsUploadOpen(true)} variant="gradient">
              Create Your First Gallery
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {galleries.map((gallery) => (
              <GalleryCard
                key={gallery.id}
                id={gallery.id}
                title={gallery.title}
                description={gallery.description}
                thumbnail={gallery.thumbnail}
                mediaCount={gallery.mediaCount}
                isLocked={gallery.isLocked}
                requiredNFT={gallery.requiredNFT}
                requiredTraits={gallery.requiredTraits}
                chain={gallery.chain}
                participantCount={gallery.participantCount}
                onClick={() => handleGalleryClick(gallery)}
              />
            ))}
          </div>
        )}
      </main>

      <UploadModal open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      <AIAssistant />
    </div>
  );
};

export default Index;