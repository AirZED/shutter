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
import { Upload, X, Plus, Trash2, Loader2, Image as ImageIcon, Video, Music, File, Sparkles, Lock, Globe, CheckCircle2, FolderPlus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWallet as useWalletContext } from "@/contexts/WalletContext";
import {
  MediaFile,
  GalleryConfig,
  NFTCollectionConfig,
  mintGalleryNFT,
} from "@/lib/nft-minting";
import { useWalrusUpload } from "@/hooks/useWalrusUpload";
import { useGalleries, Gallery } from "@/hooks/useGalleries";
import { useToast } from "@/hooks/use-toast";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import axios from "axios";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGalleryId?: string; // Pre-select this gallery when opening
  onGalleryUpdated?: (galleryId: string, newGalleryUri: string) => void; // Callback when gallery is updated
}

export const UploadModal = ({ open, onOpenChange, defaultGalleryId, onGalleryUpdated }: UploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [createGallery, setCreateGallery] = useState(false);
  const [addToExistingGallery, setAddToExistingGallery] = useState(false);
  const [selectedExistingGallery, setSelectedExistingGallery] = useState<string>("");
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
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [filePreviews, setFilePreviews] = useState<Record<number, string>>({});
  const [walBalance, setWalBalance] = useState<string>("0");
  const [suiBalance, setSuiBalance] = useState<string>("0");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const account = useCurrentAccount();
  const suiClient = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });

  const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
  const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
  const WAL_TYPE = "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";

  // Generate previews for image files
  const generatePreview = (file: File, index: number) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviews((prev) => ({
          ...prev,
          [index]: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const { connection } = useWalletContext();
  const { uploadMediaToWalrus, uploadGalleryToWalrus, updateGalleryInWalrus } = useWalrusUpload();
  const isConnected = connection?.isConnected || false;
  const address = connection?.address;
  const { galleries, fetchGalleries } = useGalleries(address);
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  console.log("connection", connection);
  const { toast } = useToast();

  // Filter galleries to only show ones owned by current user
  const userGalleries = galleries.filter(
    (gallery) => gallery.owner.toLowerCase() === address?.toLowerCase()
  );

  // Fetch balances
  const fetchBalances = async () => {
    if (!account) return;
    try {
      const [walBal, suiBal] = await Promise.all([
        suiClient.getBalance({
          owner: account.address,
          coinType: WAL_TYPE,
        }),
        suiClient.getBalance({
          owner: account.address,
        }),
      ]);

      setWalBalance((Number(walBal.totalBalance) / 1e9).toFixed(4));
      setSuiBalance((Number(suiBal.totalBalance) / 1e9).toFixed(4));
    } catch (error) {
      console.error("Balance fetch failed:", error);
    }
  };

  // Load galleries and balances when modal opens
  useEffect(() => {
    if (open && isConnected) {
      fetchGalleries();
      fetchBalances();
    }
  }, [open, isConnected, account]);

  // Auto-select default gallery when modal opens
  useEffect(() => {
    if (open && defaultGalleryId && userGalleries.length > 0) {
      const defaultGallery = userGalleries.find(g => g.id === defaultGalleryId);
      if (defaultGallery) {
        setAddToExistingGallery(true);
        setSelectedExistingGallery(defaultGalleryId);
        setCreateGallery(false);
      }
    }
  }, [open, defaultGalleryId, userGalleries]);

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      const startIndex = selectedFiles.length;
      setSelectedFiles((prev) => {
        const updated = [...prev, ...newFiles];
        // Generate previews for new files
        newFiles.forEach((file, i) => {
          generatePreview(file, startIndex + i);
        });
        return updated;
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const updated = { ...prev };
      delete updated[index];
      // Reindex remaining previews
      const newPreviews: Record<number, string> = {};
      Object.keys(updated).forEach((key) => {
        const oldIndex = parseInt(key);
        if (oldIndex > index) {
          newPreviews[oldIndex - 1] = updated[oldIndex];
        } else if (oldIndex < index) {
          newPreviews[oldIndex] = updated[oldIndex];
        }
      });
      return newPreviews;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
    if (file.type.startsWith("video/")) return <Video className="w-5 h-5" />;
    if (file.type.startsWith("audio/")) return <Music className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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

  // Mint NFT on Sui using the actual contract (from /mint)
  const mintSuiNFT = async (
    blobId: string,
    name: string,
    description: string,
    accessTier: string = "public"
  ) => {
    if (!blobId || !account) {
      throw new Error("Missing blob ID or account");
    }

    setUploadStatus("Minting NFT...");

    const txb = new Transaction();

    // Construct the full image URL from the blob ID (like in /mint)
    const imageUrl = `${AGGREGATOR}/v1/blobs/${blobId}`;

    console.log("Minting NFT with arguments:", {
      name,
      description,
      walrus_blob_id: blobId,
      image_url: imageUrl,
      access_tier: accessTier,
    });

    // Use the actual gallery_nft contract call
    txb.moveCall({
      target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::mint`,
      arguments: [
        txb.pure.string(name),
        txb.pure.string(description),
        txb.pure.string(blobId), // walrus_blob_id
        txb.pure.string(imageUrl), // image_url
        txb.pure.string(accessTier), // access_tier
      ],
    });

    const result = await signAndExecuteTransaction({
      transaction: txb,
    });

    await fetchBalances(); // Refresh balances after mint

    return {
      transactionHash: result.digest,
      chain: "sui" as const,
    };
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

    if (addToExistingGallery && !selectedExistingGallery) {
      toast({
        title: "Gallery Not Selected",
        description: "Please select a gallery to add files to",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      setUploadStatus("Uploading media to Walrus...");

      // Always upload all media to Walrus first
      const mediaUris: {
        name: string;
        uri: string;
        blobId: string;
        type: "image" | "video" | "audio";
      }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatus(`Uploading ${i + 1}/${selectedFiles.length} files...`);

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

        // Extract blob ID from URI (format: https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId})
        const blobId = imageUri.replace("https://aggregator.walrus-testnet.walrus.space/v1/blobs/", "").replace("https://blob.walrus.testnet.space/", "");

        mediaUris.push({
          name: mediaFile.name,
          uri: imageUri,
          blobId,
          type: mediaFile.type,
        });
      }

      setUploadStatus(`Successfully uploaded ${selectedFiles.length} files to Walrus`);
      toast({
        title: "Media Uploaded",
        description: `Successfully uploaded ${selectedFiles.length} files to Walrus`,
      });

      let galleryId: string | undefined = undefined;
      let updatedGalleryUri: string | undefined = undefined;

      // Add to existing gallery if selected
      if (addToExistingGallery && selectedExistingGallery) {
        const existingGallery = userGalleries.find(g => g.id === selectedExistingGallery);
        if (existingGallery) {
          const { galleryUri: newGalleryUri, transactionHash } = await updateGalleryInWalrus(
            existingGallery.galleryUri,
            mediaUris
          );
          updatedGalleryUri = newGalleryUri;
          galleryId = existingGallery.id;

          // Update on-chain Gallery object
          try {
            const newMediaCount = (existingGallery.mediaUris?.length || 0) + mediaUris.length;
            const txb = new Transaction();
            txb.moveCall({
              target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::update_gallery`,
              arguments: [
                txb.object(existingGallery.id), // Gallery object
                txb.pure.string(existingGallery.title),
                txb.pure.string(existingGallery.description),
                txb.pure.u64(newMediaCount),
                txb.pure.string(newGalleryUri),
              ],
            });

            await signAndExecuteTransaction({
              transaction: txb,
            });

            console.log('✅ On-chain gallery updated successfully');
          } catch (error) {
            console.error('Error updating on-chain gallery:', error);
            // Don't fail the whole operation if on-chain update fails
          }

          toast({
            title: "Gallery Updated",
            description: `Successfully added ${selectedFiles.length} media files to "${existingGallery.title}"`,
          });

          // Notify parent component of the update
          if (onGalleryUpdated) {
            onGalleryUpdated(existingGallery.id, newGalleryUri);
          }
        }
      }
      // Create new gallery if selected
      else if (createGallery && galleryTitle) {
        galleryId = `sui_gallery_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const { galleryUri, transactionHash } = await uploadGalleryToWalrus(
          galleryId,
          galleryTitle,
          galleryDescription || description,
          mediaUris,
          address!,
          visibility,
          "sui",
          {
            type: accessControl,
            requiredNFT: accessControl !== "public" ? requiredNFT : undefined,
            requiredTraits:
              accessControl === "trait_required" ? requiredTraits : undefined,
          }
        );

        toast({
          title: "Gallery Created",
          description: `New gallery "${galleryTitle}" created and stored in Walrus`,
        });

        // Create gallery on-chain (and mint NFT if needed) - ALL IN ONE TRANSACTION
        setUploadStatus("Creating gallery on-chain (single signature required)...");
        try {
          const txb = new Transaction();

          // Step 1: Create gallery on-chain
          // Galleries are always public - is_locked indicates NFT required for media viewing
          const requiresNFT = visibility === "private" || mintNFTForGallery || accessControl !== "public";
          txb.moveCall({
            target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::create_gallery`,
            arguments: [
              txb.pure.string(galleryId),
              txb.pure.string(galleryTitle),
              txb.pure.string(galleryDescription || description),
              txb.pure.string(mediaUris[0]?.uri || ""),
              txb.pure.u64(mediaUris.length),
              txb.pure.bool(requiresNFT), // is_locked: true if NFT required for media
              txb.pure.string(accessControl !== "public" ? requiredNFT || "" : ""),
              txb.pure.string("public"), // visibility: always public - galleries are visible to everyone
              txb.pure.string(galleryUri),
            ],
          });

          // Step 2: Mint NFT if requested (in the same transaction)
          if (mintNFTForGallery && visibility === "private") {
            const nftName = collectionName || `${galleryTitle} Access`;
            const nftDescription = collectionSymbol || `Access pass for gallery: ${galleryTitle}\n\nGallery URI: ${galleryUri}`;

            const firstMedia = mediaUris[0];
            if (firstMedia && firstMedia.blobId) {
              const imageUrl = `${AGGREGATOR}/v1/blobs/${firstMedia.blobId}`;

              // Add mint call to the same transaction
              txb.moveCall({
                target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::mint`,
                arguments: [
                  txb.pure.string(nftName),
                  txb.pure.string(nftDescription),
                  txb.pure.string(firstMedia.blobId),
                  txb.pure.string(imageUrl),
                  txb.pure.string("exclusive"), // access_tier
                ],
              });
            }
          }

          // Execute single transaction (one signature for everything)
          const result = await signAndExecuteTransaction({
            transaction: txb,
          });

          console.log('✅ Gallery created on-chain (single transaction):', result.digest);

          // Extract NFT object ID if minting was included
          let nftObjectId: string | null = null;
          if (mintNFTForGallery && visibility === "private") {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000));

              const suiClient = new SuiClient({
                url: getFullnodeUrl("testnet"),
              });

              const txDetails = await suiClient.getTransactionBlock({
                digest: result.digest,
                options: {
                  showEffects: true,
                  showObjectChanges: true,
                },
              });

              // Check object changes for created NFT
              if (txDetails.objectChanges) {
                for (const change of txDetails.objectChanges) {
                  if (change.type === 'created' && 'objectType' in change) {
                    const objectType = change.objectType as string;
                    if (objectType.includes('gallery_nft::GalleryNFT')) {
                      nftObjectId = change.objectId;
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching NFT object ID:', error);
            }
          }

          // Show success message
          const messages = [];
          messages.push(`Gallery "${galleryTitle}" is now stored on-chain`);

          if (mintNFTForGallery && visibility === "private") {
            if (nftObjectId) {
              messages.push(`NFT minted successfully!`);
            } else {
              messages.push(`NFT mint transaction completed`);
            }
          }

          toast({
            title: "Success!",
            description: messages.join(" "),
            action: (
              <div className="flex flex-col gap-2">
                <a
                  href={`https://testnet.suivision.xyz/txblock/${result.digest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  View Transaction
                </a>
                {nftObjectId && (
                  <a
                    href={`https://testnet.suivision.xyz/object/${nftObjectId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View NFT
                  </a>
                )}
              </div>
            ),
          });
        } catch (error) {
          console.error('Error creating gallery/NFT on-chain:', error);
          toast({
            title: "Warning",
            description: `Gallery created in Walrus but on-chain creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            variant: "destructive",
          });
        }
      }

      // Reset form
      setSelectedFiles([]);
      setFilePreviews({});
      setTitle("");
      setDescription("");
      setVisibility("public");
      setCreateGallery(false);
      setAddToExistingGallery(false);
      setSelectedExistingGallery("");
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
      <DialogContent className="sm:max-w-[800px] glass-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎨 Create Gallery & Mint NFT
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Upload your media to decentralized storage and create an NFT-gated gallery
          </DialogDescription>
        </DialogHeader>

        {/* Balance Display - Like /mint */}
        {isConnected && account && (
          <div className="mb-6 p-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white font-bold text-sm">W</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">WAL Balance</p>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{walBalance}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">SUI Balance</p>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{suiBalance}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBalances}
              className="mt-4 w-full"
            >
              🔄 Refresh Balances
            </Button>

            {/* Low Balance Warning */}
            {parseFloat(walBalance) < 0.01 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-red-800 dark:text-red-200 font-bold text-sm mb-1">Low WAL Balance</h3>
                    <p className="text-red-700 dark:text-red-300 text-xs mb-2">
                      You need WAL tokens to upload files. Get some from the faucet.
                    </p>
                    <a
                      href="https://faucet.walrus.site/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 text-xs font-medium transition-all"
                    >
                      🚰 Get WAL Tokens
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Display */}
        {uploadStatus && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              <span className="font-bold">Status:</span> {uploadStatus}
            </p>
          </div>
        )}

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="gallery">Gallery & NFT Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${dragActive
                ? "border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent scale-[1.01] shadow-lg shadow-primary/20"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center space-y-6">
                <div
                  className={`p-6 rounded-2xl transition-all duration-300 ${dragActive
                    ? "bg-gradient-to-br from-primary/20 to-primary/10 scale-110"
                    : "bg-gradient-to-br from-muted/50 to-muted/30"
                    }`}
                >
                  <Upload
                    className={`w-12 h-12 transition-all duration-300 ${dragActive ? "text-primary scale-110" : "text-muted-foreground"
                      }`}
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-xl font-semibold">
                    {dragActive ? "✨ Drop your files here" : "Upload Your Media"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Drag and drop your files here, or click the button below to browse
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    <Video className="w-4 h-4 text-muted-foreground" />
                    <Music className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Images, Videos, Audio</span>
                  </div>
                </div>
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-8 py-6 text-base"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Choose Files
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {selectedFiles.length} {selectedFiles.length === 1 ? "File" : "Files"} Selected
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFiles([]);
                      setFilePreviews({});
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-1">
                  {selectedFiles.map((file, index) => {
                    const preview = filePreviews[index];
                    const isImage = file.type.startsWith("image/");
                    return (
                      <div
                        key={index}
                        className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted/30 hover:border-primary/50 transition-all duration-200"
                      >
                        {isImage && preview ? (
                          <img
                            src={preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30">
                            <div className="p-3 rounded-full bg-primary/10 mb-2">
                              {getFileIcon(file)}
                            </div>
                            <p className="text-xs font-medium text-center px-2 truncate w-full">
                              {file.name}
                            </p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 rounded-full p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-6 pt-4">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
                  <File className="w-4 h-4" />
                  Media Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter a title for your media"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  This title will be applied to all uploaded media files
                </p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="description" className="text-base font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your media content, theme, or story..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] resize-none text-base"
                />
                <p className="text-xs text-muted-foreground">
                  Provide context and details about your media collection
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Visibility Settings
                </Label>
                <Select
                  value={visibility}
                  onValueChange={(value: "public" | "private") =>
                    setVisibility(value)
                  }
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center space-x-3 py-1">
                        <Globe className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="font-medium">Public Gallery</div>
                          <div className="text-xs text-muted-foreground">Anyone can view</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center space-x-3 py-1">
                        <Lock className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="font-medium">Private Gallery</div>
                          <div className="text-xs text-muted-foreground">NFT holders only</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className={`p-3 rounded-lg border ${visibility === "public"
                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                  }`}>
                  <p className="text-xs text-muted-foreground">
                    {visibility === "public"
                      ? "🌐 Your gallery will be visible and accessible to everyone"
                      : "🔒 Only users with the required NFT can access your gallery"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="space-y-6">
            <div className="space-y-4">
              {/* Add to Existing Gallery Option */}
              {userGalleries.length > 0 ? (
                <div className="flex items-start space-x-4 p-5 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-xl border-2 border-blue-500/20 hover:border-blue-500/40 transition-all">
                  <input
                    type="checkbox"
                    id="addToExistingGallery"
                    checked={addToExistingGallery}
                    onChange={(e) => {
                      setAddToExistingGallery(e.target.checked);
                      if (e.target.checked) {
                        setCreateGallery(false);
                      }
                    }}
                    className="w-5 h-5 rounded border-border mt-1 cursor-pointer"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="addToExistingGallery"
                      className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                    >
                      <FolderPlus className="w-5 h-5 text-blue-500" />
                      Add to Existing Gallery
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add these files to one of your existing galleries
                    </p>
                    {addToExistingGallery && (
                      <div className="mt-4 space-y-2">
                        <Label className="text-sm font-medium">Select Gallery</Label>
                        <Select
                          value={selectedExistingGallery}
                          onValueChange={setSelectedExistingGallery}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Choose a gallery..." />
                          </SelectTrigger>
                          <SelectContent>
                            {userGalleries.map((gallery) => (
                              <SelectItem key={gallery.id} value={gallery.id}>
                                <div className="flex items-center gap-3 py-1">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                    {gallery.thumbnail ? (
                                      <img
                                        src={gallery.thumbnail}
                                        alt={gallery.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <FolderPlus className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{gallery.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {gallery.mediaCount} items • {gallery.visibility}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-xl border border-dashed">
                  <p className="text-sm text-muted-foreground text-center">
                    You don't have any galleries yet. Create your first gallery to get started!
                  </p>
                </div>
              )}

              {/* Create New Gallery Option */}
              <div className="flex items-start space-x-4 p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all">
                <input
                  type="checkbox"
                  id="createGallery"
                  checked={createGallery}
                  onChange={(e) => {
                    setCreateGallery(e.target.checked);
                    if (e.target.checked) {
                      setAddToExistingGallery(false);
                      setSelectedExistingGallery("");
                    }
                  }}
                  className="w-5 h-5 rounded border-border mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="createGallery"
                    className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                    Create New Gallery
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Organize your media into a beautifully curated gallery collection
                  </p>
                </div>
              </div>
            </div>

            {createGallery && (
              <div className="space-y-5 p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border-2 border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-semibold">Gallery Settings</h3>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="galleryTitle"
                      className="text-base font-semibold"
                    >
                      Gallery Title
                    </Label>
                    <Input
                      id="galleryTitle"
                      placeholder="e.g., My Photography Collection"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="galleryDescription"
                      className="text-base font-semibold"
                    >
                      Gallery Description
                    </Label>
                    <Textarea
                      id="galleryDescription"
                      placeholder="Describe your gallery theme, inspiration, and content..."
                      value={galleryDescription}
                      onChange={(e) => setGalleryDescription(e.target.value)}
                      className="min-h-[120px] resize-none text-base"
                    />
                  </div>

                  {/* Gallery Access Control */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Gallery Access Control
                    </Label>
                    <Select
                      value={accessControl}
                      onValueChange={(
                        value: "public" | "nft_required" | "trait_required"
                      ) => setAccessControl(value)}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center space-x-3 py-1">
                            <Globe className="w-4 h-4 text-green-500" />
                            <div>
                              <div className="font-medium">Public Access</div>
                              <div className="text-xs text-muted-foreground">Open to everyone</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="nft_required">
                          <div className="flex items-center space-x-3 py-1">
                            <Lock className="w-4 h-4 text-blue-500" />
                            <div>
                              <div className="font-medium">NFT Required</div>
                              <div className="text-xs text-muted-foreground">Any NFT from collection</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="trait_required">
                          <div className="flex items-center space-x-3 py-1">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <div>
                              <div className="font-medium">Specific Traits Required</div>
                              <div className="text-xs text-muted-foreground">Custom trait matching</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define the access requirements for your gallery
                    </p>
                  </div>

                  {accessControl === "nft_required" && (
                    <div className="space-y-2">
                      <Label htmlFor="requiredNFT" className="text-base font-semibold">
                        Required NFT Contract Address
                      </Label>
                      <Input
                        id="requiredNFT"
                        placeholder="0x..."
                        value={requiredNFT}
                        onChange={(e) => setRequiredNFT(e.target.value)}
                        className="h-12 text-base font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the Sui NFT collection contract address
                      </p>
                    </div>
                  )}

                  {accessControl === "trait_required" && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Required Traits
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Trait name (e.g., Rarity)"
                          value={newTraitKey}
                          onChange={(e) => setNewTraitKey(e.target.value)}
                          className="h-11"
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && newTraitKey && newTraitValue) {
                              addTrait();
                            }
                          }}
                        />
                        <Input
                          placeholder="Trait value (e.g., Legendary)"
                          value={newTraitValue}
                          onChange={(e) => setNewTraitValue(e.target.value)}
                          className="h-11"
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && newTraitKey && newTraitValue) {
                              addTrait();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={addTrait}
                          size="lg"
                          variant="gradient"
                          disabled={!newTraitKey || !newTraitValue}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {Object.keys(requiredTraits).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Active Traits ({Object.keys(requiredTraits).length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(requiredTraits).map(
                              ([key, value]) => (
                                <Badge
                                  key={key}
                                  variant="secondary"
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm"
                                >
                                  <span className="font-medium">{key}:</span>
                                  <span>{value}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTrait(key)}
                                    className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start space-x-4 p-5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl border-2 border-purple-500/20 hover:border-purple-500/40 transition-all">
              <input
                type="checkbox"
                id="mintNFTForGallery"
                checked={mintNFTForGallery}
                onChange={(e) => setMintNFTForGallery(e.target.checked)}
                className="w-5 h-5 rounded border-border mt-1 cursor-pointer"
              />
              <div className="flex-1">
                <Label
                  htmlFor="mintNFTForGallery"
                  className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Mint Access NFT
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a unique NFT that grants exclusive access to your private gallery
                </p>
              </div>
            </div>

            {mintNFTForGallery && (
              <div className="space-y-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                    🎨 Mint Your NFT
                  </h3>
                  <p className="text-green-600 dark:text-green-400">Create your unique NFT tied to this gallery</p>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="collectionName"
                        className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        NFT Name *
                      </Label>
                      <Input
                        id="collectionName"
                        placeholder="e.g., Gallery Access Pass"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        className="h-12 text-base border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 bg-white/80 dark:bg-gray-900/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="accessTier"
                        className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                      >
                        Access Tier
                      </Label>
                      <Select
                        value={visibility}
                        onValueChange={(value: "public" | "private") => setVisibility(value)}
                      >
                        <SelectTrigger className="h-12 text-base border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 bg-white/80 dark:bg-gray-900/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <span>🌍 Public (Free Access)</span>
                          </SelectItem>
                          <SelectItem value="private">
                            <span>👑 Exclusive (VIP Only)</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="nftDescription"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      Description *
                    </Label>
                    <Textarea
                      id="nftDescription"
                      placeholder="Describe your NFT and what access it grants..."
                      value={collectionSymbol}
                      onChange={(e) => setCollectionSymbol(e.target.value)}
                      className="min-h-[120px] resize-none text-base border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 bg-white/80 dark:bg-gray-900/80"
                    />
                  </div>

                  <div className="p-4 bg-white/60 dark:bg-gray-900/60 rounded-xl border border-green-200 dark:border-green-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      <span className="font-semibold text-green-700 dark:text-green-300">ℹ️</span> This will create a unique NFT that can gate access to your gallery and be traded on Sui marketplaces
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 justify-end pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="px-6 h-11"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleUpload}
            disabled={
              isUploading ||
              selectedFiles.length === 0 ||
              !isConnected ||
              (addToExistingGallery && !selectedExistingGallery) ||
              (createGallery && !galleryTitle)
            }
            className="px-8 h-11 text-base font-semibold"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {addToExistingGallery
                  ? "Adding to Gallery..."
                  : createGallery
                    ? "Creating Gallery..."
                    : "Uploading..."}
              </>
            ) : (
              <>
                {addToExistingGallery ? (
                  <>
                    <FolderPlus className="w-5 h-5 mr-2" />
                    Add to Gallery
                  </>
                ) : createGallery ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Gallery
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Media
                  </>
                )}
              </>
            )}
          </Button>
        </div>
        {!isConnected && (
          <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Please connect your wallet to upload media and create galleries
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
