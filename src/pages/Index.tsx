import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { GalleryCard } from "@/components/GalleryCard";
import { UploadModal } from "@/components/UploadModal";
import { AIAssistant } from "@/components/AIAssistant";
import { useToast } from "@/hooks/use-toast";

// Mock galleries data
const mockGalleries = [
  {
    id: "1",
    title: "Sunset Photography Collection",
    description: "A curated collection of breathtaking sunset photographs from around the world",
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
    mediaCount: 12,
    isLocked: false,
    participantCount: 24,
  },
  {
    id: "2",
    title: "Exclusive NFT Art Gallery",
    description: "Premium digital art collection accessible only to verified NFT holders",
    thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop",
    mediaCount: 8,
    isLocked: true,
    requiredNFT: "CryptoPunks",
    participantCount: 15,
  },
  {
    id: "3",
    title: "Product Showcase & Demos",
    description: "Professional product photography and demonstration videos",
    thumbnail: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop",
    mediaCount: 18,
    isLocked: false,
    participantCount: 42,
  },
  {
    id: "4",
    title: "VIP Members Only",
    description: "Exclusive content and behind-the-scenes footage for VIP members",
    thumbnail: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&h=400&fit=crop",
    mediaCount: 25,
    isLocked: true,
    requiredNFT: "BAYC",
    participantCount: 8,
  },
  {
    id: "5",
    title: "Nature & Wildlife",
    description: "Stunning captures of nature's beauty and wildlife moments",
    thumbnail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop",
    mediaCount: 32,
    isLocked: false,
    participantCount: 67,
  },
  {
    id: "6",
    title: "Abstract Art Collection",
    description: "Modern abstract art pieces from emerging digital artists",
    thumbnail: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop",
    mediaCount: 15,
    isLocked: false,
    participantCount: 31,
  },
  {
    id: "7",
    title: "Private Event Archive",
    description: "Exclusive event photos and videos for attendees only",
    thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop",
    mediaCount: 45,
    isLocked: true,
    requiredNFT: "Azuki",
    participantCount: 12,
  },
  {
    id: "8",
    title: "Tech & Innovation",
    description: "Cutting-edge technology and innovation showcase",
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop",
    mediaCount: 28,
    isLocked: false,
    participantCount: 89,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const { toast } = useToast();

  const handleConnectWallet = () => {
    if (!isWalletConnected) {
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to MetaMask",
      });
      setIsWalletConnected(true);
    }
  };

  const handleGalleryClick = (gallery: typeof mockGalleries[0]) => {
    if (gallery.isLocked && !isWalletConnected) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to access this gallery",
        variant: "destructive",
      });
      return;
    }
    navigate(`/gallery/${gallery.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onUploadClick={() => setIsUploadOpen(true)}
        onConnectWallet={handleConnectWallet}
        isWalletConnected={isWalletConnected}
      />
      <main className="container mx-auto px-4 py-8">
        <HeroSection onGetStarted={() => setIsUploadOpen(true)} />
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Explore Galleries</h2>
          <p className="text-muted-foreground">
            Discover curated collections of media. Some galleries require specific NFTs to access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockGalleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              id={gallery.id}
              title={gallery.title}
              description={gallery.description}
              thumbnail={gallery.thumbnail}
              mediaCount={gallery.mediaCount}
              isLocked={gallery.isLocked}
              requiredNFT={gallery.requiredNFT}
              participantCount={gallery.participantCount}
              onClick={() => handleGalleryClick(gallery)}
            />
          ))}
        </div>
      </main>

      <UploadModal open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      <AIAssistant />
    </div>
  );
};

export default Index;
