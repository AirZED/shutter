import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useWallet as useWalletContext } from "@/contexts/WalletContext";
import {
  MediaFile,
  GalleryConfig,
  NFTCollectionConfig,
  mintGalleryNFT,
} from "@/lib/nft-minting";
import { useWalrusUpload } from "@/hooks/useWalrusUpload";
import { useToast } from "@/hooks/use-toast";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { generateSigner, percentAmount } from "@metaplex-foundation/umi";
import { createProgrammableNft } from "@metaplex-foundation/mpl-token-metadata";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadModal = ({ open, onOpenChange }: UploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedChain, setSelectedChain] = useState<"solana" | "sui">(
    "solana"
  );
  const [createGallery, setCreateGallery] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryDescription, setGalleryDescription] = useState("");
  const [mintNFTForGallery, setMintNFTForGallery] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSymbol, setCollectionSymbol] = useState("");
  const [accessControl, setAccessControl] = useState<
    "public" | "nft_required" | "trait_required"
  >("public");
  const [requiredNFT, setRequiredNFT] = useState("");
  const [requiredTraits, setRequiredTraits] = useState<Record<string, string>>(
    {}
  );
  const [newTraitKey, setNewTraitKey] = useState("");
  const [newTraitValue, setNewTraitValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { connection } = useWalletContext();
  const { uploadMediaToWalrus, uploadGalleryToWalrus } = useWalrusUpload();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const solanaWallet = useSolanaWallet();

  console.log("connection", connection);
  const isConnected = connection?.isConnected || false;
  const address = connection?.address;
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addTrait = () => {
    if (newTraitKey && newTraitValue) {
      setRequiredTraits((prev) => ({
        ...prev,
        [newTraitKey]: newTraitValue,
      }));
      setNewTraitKey("");
      setNewTraitValue("");
    }
  };

  const removeTrait = (key: string) => {
    setRequiredTraits((prev) => {
      const newTraits = { ...prev };
      delete newTraits[key];
      return newTraits;
    });
  };

  // Mint NFT on Sui
  const mintSuiNFT = async (
    mediaUri: string,
    metadataUri: string,
    name: string,
    description: string
  ) => {
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::mint`,
        arguments: [
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(""), // walrus_blob_id (empty for external URLs)
          tx.pure.string(mediaUri), // image_url
          tx.pure.string(accessTier || "public"),
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return {
        transactionHash: result.digest,
        chain: "sui" as const,
      };
    } catch (error) {
      console.error("Error minting Sui NFT:", error);
      throw new Error(
        `Failed to mint Sui NFT: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Mint NFT on Solana
  const mintSolanaNFT = async (
    mediaUri: string,
    metadataUri: string,
    name: string,
    description: string
  ) => {
    try {
      if (!solanaWallet.publicKey || !solanaWallet.signTransaction) {
        throw new Error("Solana wallet not connected");
      }

      const network = WalletAdapterNetwork.Testnet;
      const endpoint = clusterApiUrl(network);
      const connection = new Connection(endpoint);

      const umi = createUmi(endpoint)
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(solanaWallet));

      const mint = generateSigner(umi);
      const metadata = {
        name,
        symbol: collectionSymbol || "GALLERY",
        description,
        image: mediaUri,
        external_url: mediaUri,
        attributes: [
          {
            trait_type: "Gallery Access",
            value: "Premium",
          },
          {
            trait_type: "Chain",
            value: "Solana",
          },
        ],
      };

      const metadataUri = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${Date.now()}`;

      const nft = await createProgrammableNft(umi, {
        mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        creators: [
          {
            address: solanaWallet.publicKey,
            verified: true,
            percentage: 100,
          },
        ],
        isMutable: true,
        isCollection: false,
      });

      await nft.sendAndConfirm(umi);

      return {
        transactionHash: base58.deserialize(nft.signature)[0],
        chain: "solana" as const,
      };
    } catch (error) {
      console.error("Error minting Solana NFT:", error);
      throw new Error(
        `Failed to mint Solana NFT: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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
      const mediaUris: {
        name: string;
        uri: string;
        type: "image" | "video" | "audio";
      }[] = [];
      for (const file of selectedFiles) {
        const mediaFile: MediaFile = {
          file,
          name: title || file.name,
          description: description,
          type: file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
            ? "video"
            : "audio",
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

      let galleryId: string | undefined = undefined;

      // Create gallery if selected
      if (createGallery && galleryTitle) {
        galleryId = `${selectedChain}_gallery_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

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
            requiredNFT: accessControl !== "public" ? requiredNFT : undefined,
            requiredTraits:
              accessControl === "trait_required" ? requiredTraits : undefined,
          }
        );

        toast({
          title: "Gallery Created",
          description: `New gallery "${galleryTitle}" created and stored in Walrus (Tx: ${transactionHash})`,
        });
      }

      // Mint NFT for gallery access if selected and private
      if (mintNFTForGallery && visibility === "private" && galleryId) {
        try {
          const nftName = collectionName || `${galleryTitle} Access`;
          const nftDescription = `Access pass for gallery: ${galleryTitle}`;

          let mintResult;
          if (selectedChain === "sui") {
            // Use the first media URI for Sui minting
            const firstMedia = mediaUris[0];
            if (!firstMedia) {
              throw new Error("No media available for minting");
            }
            mintResult = await mintSuiNFT(
              firstMedia.uri,
              firstMedia.uri,
              nftName,
              nftDescription
            );
          } else {
            // Use the first media URI for Solana minting
            const firstMedia = mediaUris[0];
            if (!firstMedia) {
              throw new Error("No media available for minting");
            }
            mintResult = await mintSolanaNFT(
              firstMedia.uri,
              firstMedia.uri,
              nftName,
              nftDescription
            );
          }

          toast({
            title: "NFT Minted",
            description: `Successfully minted access NFT for gallery "${galleryTitle}" on ${selectedChain} (Tx: ${mintResult.transactionHash})`,
          });
        } catch (error) {
          console.error("Error minting NFT:", error);
          toast({
            title: "NFT Minting Failed",
            description: `Failed to mint NFT: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            variant: "destructive",
          });
        }
      }

      // Reset form
      setSelectedFiles([]);
      setTitle("");
      setDescription("");
      setVisibility("public");
      setCreateGallery(false);
      setGalleryTitle("");
      setGalleryDescription("");
      setMintNFTForGallery(false);
      setCollectionName("");
      setCollectionSymbol("");
      setAccessControl("public");
      setRequiredNFT("");
      setRequiredTraits({});

      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "Failed to upload files",
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
          <DialogTitle className="text-2xl font-bold">
            Create Gallery
          </DialogTitle>
          <DialogDescription className="text-base">
            Upload your media files to Walrus storage and create a gallery with
            optional NFT access control
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="gallery">Gallery & NFT Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center space-y-4">
                <div
                  className={`p-4 rounded-full transition-colors ${
                    dragActive ? "bg-primary/10" : "bg-muted/50"
                  }`}
                >
                  <Upload
                    className={`w-8 h-8 transition-colors ${
                      dragActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {dragActive ? "Drop your files here" : "Upload your media"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports images, videos, and audio files
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
              </div>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Selected Files ({selectedFiles.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-medium">
                  Media Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter a title for your media"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  This title will be applied to all uploaded media
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your media content"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Provide context about your media
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium">Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(value: "public" | "private") =>
                    setVisibility(value)
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Public - Anyone can view</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>Private - NFT holders only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {visibility === "public"
                    ? "Your gallery will be visible to everyone"
                    : "Only users with the required NFT can access your gallery"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border">
                <input
                  type="checkbox"
                  id="createGallery"
                  checked={createGallery}
                  onChange={(e) => setCreateGallery(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="createGallery"
                    className="text-base font-medium cursor-pointer"
                  >
                    Create New Gallery
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Organize your media into a curated gallery collection
                  </p>
                </div>
              </div>
            </div>

            {createGallery && (
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                <h3 className="text-lg font-semibold">Gallery Settings</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="galleryTitle"
                      className="text-base font-medium"
                    >
                      Gallery Title
                    </Label>
                    <Input
                      id="galleryTitle"
                      placeholder="Enter your gallery name"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="galleryDescription"
                      className="text-base font-medium"
                    >
                      Gallery Description
                    </Label>
                    <Textarea
                      id="galleryDescription"
                      placeholder="Describe your gallery theme and content"
                      value={galleryDescription}
                      onChange={(e) => setGalleryDescription(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Blockchain Network
                    </Label>
                    <Select
                      value={selectedChain}
                      onValueChange={(value: "solana" | "sui") =>
                        setSelectedChain(value)
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solana">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Solana</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sui">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Sui</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose the blockchain for NFT minting and access control
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border">
              <input
                type="checkbox"
                id="mintNFTForGallery"
                checked={mintNFTForGallery}
                onChange={(e) => setMintNFTForGallery(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <div className="flex-1">
                <Label
                  htmlFor="mintNFTForGallery"
                  className="text-base font-medium cursor-pointer"
                >
                  Mint Access NFT
                </Label>
                <p className="text-sm text-muted-foreground">
                  Create an NFT that grants access to your private gallery
                </p>
              </div>
            </div>

            {mintNFTForGallery && (
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
                <h3 className="text-lg font-semibold">
                  NFT Collection Settings
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="collectionName"
                        className="text-base font-medium"
                      >
                        Collection Name
                      </Label>
                      <Input
                        id="collectionName"
                        placeholder="Gallery Access Pass"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="collectionSymbol"
                        className="text-base font-medium"
                      >
                        Symbol
                      </Label>
                      <Input
                        id="collectionSymbol"
                        placeholder="GACCESS"
                        value={collectionSymbol}
                        onChange={(e) => setCollectionSymbol(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      Access Control
                    </Label>
                    <Select
                      value={accessControl}
                      onValueChange={(
                        value: "public" | "nft_required" | "trait_required"
                      ) => setAccessControl(value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Public Access</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="nft_required">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>NFT Required</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="trait_required">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Specific Traits Required</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define who can access your gallery
                    </p>
                  </div>

                  {accessControl === "nft_required" && (
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

                  {accessControl === "trait_required" && (
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
                          {Object.entries(requiredTraits).map(
                            ([key, value]) => (
                              <Badge
                                key={key}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
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
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="px-8"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {createGallery ? "Creating Gallery..." : "Uploading..."}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {createGallery ? "Create Gallery" : "Upload Media"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
