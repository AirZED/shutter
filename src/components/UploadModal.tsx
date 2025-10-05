import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { MediaFile, GalleryConfig, NFTCollectionConfig, mintGalleryNFT } from "@/lib/nft-minting";
import { useWalrusUpload } from "@/hooks/useWalrusUpload";
import { useToast } from "@/hooks/use-toast";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadModal = ({ open, onOpenChange }: UploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [selectedChain, setSelectedChain] = useState<'solana' | 'sui'>('solana');
  const [createGallery, setCreateGallery] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [mintNFTForGallery, setMintNFTForGallery] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSymbol, setCollectionSymbol] = useState("");
  const [accessControl, setAccessControl] = useState<'public' | 'nft_required' | 'trait_required'>('public');
  const [requiredNFT, setRequiredNFT] = useState("");
  const [requiredTraits, setRequiredTraits] = useState<Record<string, string>>({});
  const [newTraitKey, setNewTraitKey] = useState("");
  const [newTraitValue, setNewTraitValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { connection } = useWallet();
  const { uploadMediaToWalrus, uploadGalleryToWalrus } = useWalrusUpload();

  console.log('connection', connection);
  const isConnected = connection?.isConnected || false;
  const address = connection?.address;
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTrait = () => {
    if (newTraitKey && newTraitValue) {
      setRequiredTraits(prev => ({
        ...prev,
        [newTraitKey]: newTraitValue
      }));
      setNewTraitKey("");
      setNewTraitValue("");
    }
  };

  const removeTrait = (key: string) => {
    setRequiredTraits(prev => {
      const newTraits = { ...prev };
      delete newTraits[key];
      return newTraits;
    });
  };

  const handleUpload = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to upload media",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Always upload all media to Walrus first
      const mediaUris: { name: string; uri: string; type: 'image' | 'video' | 'audio' }[] = [];
      for (const file of selectedFiles) {
        const mediaFile: MediaFile = {
          file,
          name: title || file.name,
          description: description,
          type: file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'audio',
        };
        const { imageUri } = await uploadMediaToWalrus(mediaFile);
        mediaUris.push({
          name: mediaFile.name,
          uri: imageUri,
          type: mediaFile.type,
        });
      }

      toast({
        title: "Media Uploaded",
        description: `Successfully uploaded ${selectedFiles.length} files to Walrus`,
      });

      let galleryId: string | null = null;

      // Create gallery if selected
      if (createGallery && galleryTitle) {
        const galleryId = `${selectedChain}_gallery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const { galleryUri, transactionHash } = await uploadGalleryToWalrus(
          galleryId,
          galleryTitle,
          galleryDescription || description,
          mediaUris,
          address!,
          visibility,
          selectedChain,
          {
            type: accessControl,
            requiredNFT: accessControl !== 'public' ? requiredNFT : undefined,
            requiredTraits: accessControl === 'trait_required' ? requiredTraits : undefined,
          }
        );

        toast({
          title: "Gallery Created",
          description: `New gallery "${galleryTitle}" created and stored in Walrus (Tx: ${transactionHash})`,
        });
      }

      // Mint NFT for gallery access if selected and private
      if (mintNFTForGallery && visibility === 'private' && galleryId) {
        const collectionConfig: NFTCollectionConfig = {
          name: collectionName || `${galleryTitle} Access`,
          description: `Access pass for gallery: ${galleryTitle}`,
          symbol: collectionSymbol || 'GACCESS',
          chain: selectedChain,
          accessControl: {
            type: accessControl,
            requiredNFT: accessControl !== 'public' ? requiredNFT : undefined,
            requiredTraits: accessControl === 'trait_required' ? requiredTraits : undefined,
          },
        };

        const mintedNFT = await mintGalleryNFT(galleryId, collectionConfig, address!);
        toast({
          title: "NFT Minted",
          description: `Successfully minted access NFT for gallery "${galleryTitle}" (Tx: ${mintedNFT.transactionHash})`,
        });
      }

      // Reset form
      setSelectedFiles([]);
      setTitle("");
      setDescription("");
      setVisibility('public');
      setCreateGallery(false);
      setGalleryTitle("");
      setGalleryDescription("");
      setMintNFTForGallery(false);
      setCollectionName("");
      setCollectionSymbol("");
      setAccessControl('public');
      setRequiredNFT("");
      setRequiredTraits({});

      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload Media</DialogTitle>
          <DialogDescription>
            Upload your media files to Walrus storage and optionally create a gallery with NFT access control
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="gallery">Gallery & NFT Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/10" : "border-border"
                }`}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your files here, or click to browse
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title (for each media)</Label>
                <Input
                  id="title"
                  placeholder="Enter media title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-card border-border"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (for each media)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter media description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-card border-border"
                />
              </div>
              <div>
                <Label>Default Visibility</Label>
                <Select value={visibility} onValueChange={(value: 'public' | 'private') => setVisibility(value)}>
                  <SelectTrigger className="glass-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private (NFT Gated)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="createGallery"
                checked={createGallery}
                onChange={(e) => setCreateGallery(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="createGallery">Create New Gallery</Label>
            </div>

            {createGallery && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="galleryTitle">Gallery Title</Label>
                  <Input
                    id="galleryTitle"
                    placeholder="My New Gallery"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    className="glass-card border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="galleryDescription">Gallery Description</Label>
                  <Textarea
                    id="galleryDescription"
                    placeholder="Description for the gallery"
                    value={galleryDescription}
                    onChange={(e) => setGalleryDescription(e.target.value)}
                    className="glass-card border-border"
                  />
                </div>
                <div>
                  <Label>Gallery Chain</Label>
                  <Select value={selectedChain} onValueChange={(value: 'solana' | 'sui') => setSelectedChain(value)}>
                    <SelectTrigger className="glass-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="sui">Sui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mintNFTForGallery"
                checked={mintNFTForGallery}
                onChange={(e) => setMintNFTForGallery(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="mintNFTForGallery">Mint NFT for Gallery Access (if private)</Label>
            </div>

            {mintNFTForGallery && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="collectionName">NFT Collection Name</Label>
                    <Input
                      id="collectionName"
                      placeholder="Gallery Access Pass"
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                      className="glass-card border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="collectionSymbol">Symbol</Label>
                    <Input
                      id="collectionSymbol"
                      placeholder="GACCESS"
                      value={collectionSymbol}
                      onChange={(e) => setCollectionSymbol(e.target.value)}
                      className="glass-card border-border"
                    />
                  </div>
                </div>

                <div>
                  <Label>Access Control</Label>
                  <Select value={accessControl} onValueChange={(value: 'public' | 'nft_required' | 'trait_required') => setAccessControl(value)}>
                    <SelectTrigger className="glass-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public Access</SelectItem>
                      <SelectItem value="nft_required">NFT Required</SelectItem>
                      <SelectItem value="trait_required">Specific Traits Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {accessControl === 'nft_required' && (
                  <div>
                    <Label htmlFor="requiredNFT">Required NFT Contract</Label>
                    <Input
                      id="requiredNFT"
                      placeholder="0x..."
                      value={requiredNFT}
                      onChange={(e) => setRequiredNFT(e.target.value)}
                      className="glass-card border-border"
                    />
                  </div>
                )}

                {accessControl === 'trait_required' && (
                  <div className="space-y-3">
                    <Label>Required Traits</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Trait name"
                        value={newTraitKey}
                        onChange={(e) => setNewTraitKey(e.target.value)}
                        className="glass-card border-border"
                      />
                      <Input
                        placeholder="Trait value"
                        value={newTraitValue}
                        onChange={(e) => setNewTraitValue(e.target.value)}
                        className="glass-card border-border"
                      />
                      <Button type="button" onClick={addTrait} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {Object.keys(requiredTraits).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(requiredTraits).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="flex items-center gap-1">
                            {key}: {value}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTrait(key)}
                              className="h-4 w-4 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading to Walrus...
              </>
            ) : (
              'Upload & Create'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};