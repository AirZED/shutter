import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Download, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProtectedMediaProps {
    src: string;
    alt: string;
    type: 'image' | 'video' | 'audio';
    title: string;
    description?: string;
    nftMetadata?: {
        name: string;
        description: string;
        attributes: Array<{
            trait_type: string;
            value: string;
        }>;
    };
    isProtected?: boolean;
}

export const ProtectedMedia = ({
    src,
    alt,
    type,
    title,
    description,
    nftMetadata,
    isProtected = true,
}: ProtectedMediaProps) => {
    const [isViewing, setIsViewing] = useState(false);
    const [viewCount, setViewCount] = useState(0);
    const [maxViews] = useState(3); // Limit views per session
    const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | HTMLAudioElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Disable right-click context menu
        const handleContextMenu = (e: MouseEvent) => {
            if (isProtected) {
                e.preventDefault();
                toast({
                    title: "Protected Content",
                    description: "Right-click is disabled to protect this media",
                    variant: "destructive",
                });
            }
        };

        // Disable drag and drop
        const handleDragStart = (e: DragEvent) => {
            if (isProtected) {
                e.preventDefault();
            }
        };

        // Disable keyboard shortcuts for saving
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isProtected && (e.ctrlKey || e.metaKey)) {
                if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    toast({
                        title: "Protected Content",
                        description: "Saving is disabled for this protected media",
                        variant: "destructive",
                    });
                }
            }
        };

        const element = mediaRef.current;
        if (element) {
            element.addEventListener('contextmenu', handleContextMenu);
            element.addEventListener('dragstart', handleDragStart);
            document.addEventListener('keydown', handleKeyDown);

            return () => {
                element.removeEventListener('contextmenu', handleContextMenu);
                element.removeEventListener('dragstart', handleDragStart);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isProtected, toast]);

    const handleViewToggle = () => {
        if (viewCount >= maxViews) {
            toast({
                title: "View Limit Reached",
                description: `You've reached the maximum of ${maxViews} views for this session`,
                variant: "destructive",
            });
            return;
        }

        setIsViewing(!isViewing);
        if (!isViewing) {
            setViewCount(prev => prev + 1);
        }
    };

    const handleDownloadAttempt = () => {
        toast({
            title: "Download Disabled",
            description: "This media is protected and cannot be downloaded",
            variant: "destructive",
        });
    };

    const renderMedia = () => {
        if (!isViewing) {
            return (
                <div className="relative w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Shield className="w-16 h-16 mx-auto text-muted-foreground" />
                        <div>
                            <h3 className="font-semibold text-lg">{title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {isProtected ? "Protected Media - Click to view" : "Click to view"}
                            </p>
                        </div>
                        <Button onClick={handleViewToggle} variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            View Media
                        </Button>
                    </div>
                </div>
            );
        }

        const commonProps = {
            ref: mediaRef as React.RefObject<HTMLImageElement | HTMLVideoElement | HTMLAudioElement>,
            className: "w-full h-full object-cover rounded-lg",
            onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
            onDragStart: (e: React.DragEvent) => e.preventDefault(),
        };

        switch (type) {
            case 'image':
                return (
                    <img
                        {...commonProps}
                        src={src}
                        alt={alt}
                        draggable={false}
                    />
                );
            case 'video':
                return (
                    <video
                        {...commonProps}
                        src={src}
                        controls
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture
                        onContextMenu={(e) => e.preventDefault()}
                    />
                );
            case 'audio':
                return (
                    <audio
                        {...commonProps}
                        src={src}
                        controls
                        controlsList="nodownload"
                        onContextMenu={(e) => e.preventDefault()}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Card className="glass-card border-border overflow-hidden">
            <CardContent className="p-0">
                <div className="relative">
                    {renderMedia()}

                    {isViewing && isProtected && (
                        <div className="absolute top-2 right-2 flex gap-2">
                            <Badge variant="destructive" className="glass-card">
                                <Lock className="w-3 h-3 mr-1" />
                                Protected
                            </Badge>
                            <Badge variant="secondary" className="glass-card">
                                Views: {viewCount}/{maxViews}
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">{title}</h3>
                            {description && (
                                <p className="text-sm text-muted-foreground mt-1">{description}</p>
                            )}
                        </div>
                        {isViewing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleViewToggle}
                            >
                                <EyeOff className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {nftMetadata && (
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">NFT Metadata</h4>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Name:</strong> {nftMetadata.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    <strong>Description:</strong> {nftMetadata.description}
                                </p>
                                {nftMetadata.attributes.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-1">Attributes:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {nftMetadata.attributes.map((attr, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {attr.trait_type}: {attr.value}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isProtected && (
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Shield className="w-4 h-4" />
                                <span>Protected Content</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownloadAttempt}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
