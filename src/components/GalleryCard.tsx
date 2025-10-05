import { Lock, Image, Users, Shield, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";
import { useState, useEffect } from "react";

interface GalleryCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  mediaCount: number;
  isLocked: boolean;
  requiredNFT?: string;
  requiredTraits?: Record<string, string>;
  chain?: 'solana' | 'sui';
  participantCount: number;
  onClick: () => void;
}

export const GalleryCard = ({
  title,
  description,
  thumbnail,
  mediaCount,
  isLocked,
  requiredNFT,
  requiredTraits,
  chain = 'solana',
  participantCount,
  onClick,
}: GalleryCardProps) => {
  const { isConnected, verifyNFT, nftVerification } = useWallet();
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  useEffect(() => {
    if (isConnected && isLocked && requiredNFT) {
      checkAccess();
    }
  }, [isConnected, isLocked, requiredNFT]);

  const checkAccess = async () => {
    if (!requiredNFT) return;

    setIsCheckingAccess(true);
    try {
      await verifyNFT(requiredNFT, requiredTraits);
      setHasAccess(nftVerification.verificationResult?.ownsNFT || false);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const getAccessStatus = () => {
    if (!isLocked) return 'public';
    if (!isConnected) return 'wallet_required';
    if (isCheckingAccess) return 'checking';
    if (hasAccess) return 'granted';
    return 'denied';
  };

  const accessStatus = getAccessStatus();

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden glass-card hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:scale-105"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${isLocked && !hasAccess ? "blur-sm" : ""
            }`}
        />

        {/* Access Control Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              {accessStatus === 'wallet_required' && (
                <>
                  <Lock className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                  <p className="text-xs text-amber-200 font-semibold">
                    Connect Wallet
                  </p>
                </>
              )}
              {accessStatus === 'checking' && (
                <>
                  <div className="h-8 w-8 mx-auto mb-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-blue-200 font-semibold">
                    Verifying Access...
                  </p>
                </>
              )}
              {accessStatus === 'granted' && (
                <>
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-xs text-green-200 font-semibold">
                    Access Granted
                  </p>
                </>
              )}
              {accessStatus === 'denied' && (
                <>
                  <Lock className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-xs text-red-200 font-semibold">
                    NFT Required
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge variant="secondary" className="glass-card">
            <Image className="h-3 w-3 mr-1" />
            {mediaCount}
          </Badge>
          <Badge variant="secondary" className="glass-card">
            <Users className="h-3 w-3 mr-1" />
            {participantCount}
          </Badge>
          {isLocked && (
            <Badge variant="destructive" className="glass-card">
              <Shield className="h-3 w-3 mr-1" />
              {chain?.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
          {isLocked && accessStatus === 'granted' && (
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>

        {isLocked && requiredTraits && Object.keys(requiredTraits).length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-1">Required Traits:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(requiredTraits).slice(0, 2).map(([trait, value]) => (
                <Badge key={trait} variant="outline" className="text-xs">
                  {trait}: {value}
                </Badge>
              ))}
              {Object.keys(requiredTraits).length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{Object.keys(requiredTraits).length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
