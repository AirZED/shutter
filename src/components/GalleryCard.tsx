import { Lock, Image, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GalleryCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  mediaCount: number;
  isLocked: boolean;
  requiredNFT?: string;
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
  participantCount,
  onClick,
}: GalleryCardProps) => {
  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden glass-card hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:scale-105"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
            isLocked ? "blur-sm" : ""
          }`}
        />
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-8 w-8 mx-auto mb-2 text-locked" />
              <p className="text-xs text-locked-foreground font-semibold">
                Requires {requiredNFT}
              </p>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          <Badge variant="secondary" className="glass-card">
            <Image className="h-3 w-3 mr-1" />
            {mediaCount}
          </Badge>
          <Badge variant="secondary" className="glass-card">
            <Users className="h-3 w-3 mr-1" />
            {participantCount}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </div>
    </Card>
  );
};
