import { useState } from "react";
import { X, Send, Heart, Share2, Lock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Comment {
  id: string;
  user: string;
  content: string;
  timestamp: Date;
}

interface MediaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: {
    id: string;
    title: string;
    type: "image" | "video" | "document";
    thumbnail: string;
    isLocked: boolean;
    requiredNFT?: string;
  } | null;
  isAccessible: boolean;
}

// Mock comments for each media
const mockComments: Record<string, Comment[]> = {
  "1": [
    {
      id: "1",
      user: "0x742d...89Ab",
      content: "Stunning sunset! 🌅",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      user: "0x9F3c...12Cd",
      content: "The colors are amazing!",
      timestamp: new Date(Date.now() - 1800000),
    },
  ],
  "3": [
    {
      id: "1",
      user: "0x123a...45Ef",
      content: "Great demo! Very helpful",
      timestamp: new Date(Date.now() - 7200000),
    },
  ],
};

export const MediaDetailModal = ({ open, onOpenChange, media, isAccessible }: MediaDetailModalProps) => {
  const [comments, setComments] = useState<Record<string, Comment[]>>(mockComments);
  const [newComment, setNewComment] = useState("");

  if (!media) return null;

  const mediaComments = comments[media.id] || [];

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: "You",
      content: newComment,
      timestamp: new Date(),
    };

    setComments({
      ...comments,
      [media.id]: [...mediaComments, comment],
    });
    setNewComment("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Media Display */}
          <div className="flex-1 bg-black/50 flex items-center justify-center relative">
            {isAccessible ? (
              <img
                src={media.thumbnail}
                alt={media.title}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={media.thumbnail}
                  alt={media.title}
                  className="max-w-full max-h-full object-contain blur-xl"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <Lock className="w-16 h-16 text-locked mb-4" />
                  <p className="text-locked-foreground text-lg font-semibold">
                    NFT Required
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {media.requiredNFT}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Comments Sidebar */}
          <div className="w-96 glass-card flex flex-col border-l border-border/50">
            {/* Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{media.title}</h3>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">24</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs">Share</span>
                </Button>
              </div>
            </div>

            {/* Comments */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {mediaComments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Be the first to comment!</p>
                  </div>
                ) : (
                  mediaComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 border border-primary/20">
                        <AvatarFallback className="bg-secondary/20 text-xs">
                          {comment.user.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{comment.user}</span>
                          <span className="text-xs text-muted-foreground/60">
                            {comment.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Comment Input */}
            {isAccessible && (
              <div className="p-4 border-t border-border/50">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a comment..."
                    className="flex-1 bg-background/50"
                  />
                  <Button onClick={handleSendComment} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
