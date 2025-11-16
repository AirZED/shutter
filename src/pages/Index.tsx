import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { GalleryCard } from "@/components/GalleryCard";
import { AIAssistant } from "@/components/AIAssistant";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useGalleries } from "@/hooks/useGalleries";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { connection, verifyNFT } = useWallet();
  const { galleries, loading, error, fetchGalleries } = useGalleries();
  const isConnected = connection?.isConnected || false;

  const { toast } = useToast();

  const handleGalleryClick = async (gallery: any) => {
    // Check if user is the gallery owner - they always have access
    const isOwner = connection?.address?.toLowerCase() === gallery.owner?.toLowerCase();

    if (!gallery.isLocked || isOwner) {
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

    // Since we only support Sui now, all galleries are Sui-based
    if (connection?.chain !== 'sui' && gallery.chain === 'sui') {
      toast({
        title: "Connect Sui Wallet",
        description: "Please connect your Sui wallet to access this gallery",
        variant: "destructive",
      });
      return;
    }

    // Navigate to gallery - verification will happen on the detail page
    // This allows the user to see the gallery and get better error messages
    navigate(`/gallery/${gallery.id}`);
  };

  // Refresh galleries when component mounts or when navigating back
  useEffect(() => {
    fetchGalleries();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onUploadClick={() => navigate("/create")} />
      <main className="container mx-auto px-4 py-8">
        <HeroSection onGetStarted={() => navigate("/create")} />

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
            <Button onClick={() => navigate("/create")} variant="gradient">
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

      <AIAssistant />
    </div>
  );
};

export default Index;