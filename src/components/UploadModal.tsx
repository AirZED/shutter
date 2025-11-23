import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { useState } from "react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadModal = ({ open, onOpenChange }: UploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload Media</DialogTitle>
          <DialogDescription>
            Upload your images, videos, or documents to decentralized storage
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/10" : "border-border"
            }`}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your files here, or click to browse
            </p>
            <Button variant="secondary" size="sm">
              Browse Files
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Enter media title" className="glass-card border-border" />
            </div>
            <div>
              <Label htmlFor="nft">NFT Contract Address (Optional)</Label>
              <Input
                id="nft"
                placeholder="0x..."
                className="glass-card border-border"
              />
            </div>
            <div>
              <Label htmlFor="metadata">Metadata Requirements (Optional)</Label>
              <Input
                id="metadata"
                placeholder="e.g., trait: gold, level: 5"
                className="glass-card border-border"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="gradient">Upload to IPFS</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
