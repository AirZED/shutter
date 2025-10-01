import { Lock, File, Image, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  title: string;
  type: "image" | "video" | "document";
  thumbnail: string;
  isLocked: boolean;
  requiredNFT?: string;
  onClick?: () => void;
}

export const MediaCard = ({ title, type, thumbnail, isLocked, requiredNFT, onClick }: MediaCardProps) => {
  const getIcon = () => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "document":
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg glass-card border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:glow-primary",
        isLocked && "opacity-75"
      )}
    >
      <div className="aspect-square relative overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-300 group-hover:scale-110",
            isLocked && "blur-md"
          )}
        />
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-locked/80 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <Lock className="w-8 h-8 mx-auto text-locked-foreground" />
              {requiredNFT && (
                <p className="text-xs text-locked-foreground px-2">Requires: {requiredNFT}</p>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm truncate">{title}</h3>
          <div className="text-muted-foreground">{getIcon()}</div>
        </div>
      </div>
    </div>
  );
};
