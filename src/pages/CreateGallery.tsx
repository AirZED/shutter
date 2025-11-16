import React, { useState, useEffect } from "react";
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    ConnectButton,
} from "@mysten/dapp-kit";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useWallet as useWalletContext } from "@/contexts/WalletContext";
import { useWalrusUpload } from "@/hooks/useWalrusUpload";
import { useToast } from "@/hooks/use-toast";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";
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
import { Badge } from "@/components/ui/badge";
import {
    Upload,
    X,
    Trash2,
    Loader2,
    Image as ImageIcon,
    Video,
    Music,
    File,
    Sparkles,
    Lock,
    Globe,
    ArrowLeft,
} from "lucide-react";
import { MediaFile } from "@/lib/nft-minting";

function CreateGallery() {
    const account = useCurrentAccount();
    const { mutate: signAndExecuteTransaction, isPending } = useSignAndExecuteTransaction();
    const navigate = useNavigate();
    const { address, isConnected } = useWalletContext();
    const { uploadMediaToWalrus, uploadGalleryToWalrus } = useWalrusUpload();
    const { toast } = useToast();

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<Record<number, string>>({});
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [galleryTitle, setGalleryTitle] = useState("");
    const [galleryDescription, setGalleryDescription] = useState("");
    const [mintNFTForGallery, setMintNFTForGallery] = useState(false);
    const [collectionName, setCollectionName] = useState("");
    const [collectionSymbol, setCollectionSymbol] = useState("");
    const [uploadStatus, setUploadStatus] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [walBalance, setWalBalance] = useState<string>("0");
    const [suiBalance, setSuiBalance] = useState<string>("0");

    const suiClient = new SuiClient({
        url: getFullnodeUrl("testnet"),
    });

    const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
    const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
    const WAL_TYPE =
        "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";

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

    useEffect(() => {
        if (isConnected && account) {
            fetchBalances();
        }
    }, [isConnected, account]);

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

    const handleFileSelect = (files: FileList | null) => {
        if (files) {
            const newFiles = Array.from(files);
            const startIndex = selectedFiles.length;
            setSelectedFiles((prev) => {
                const updated = [...prev, ...newFiles];
                newFiles.forEach((file, i) => {
                    generatePreview(file, startIndex + i);
                });
                return updated;
            });
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setFilePreviews((prev) => {
            const updated = { ...prev };
            delete updated[index];
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

    // Mint NFT on Sui using the actual contract
    const mintSuiNFT = async (
        blobId: string,
        name: string,
        description: string,
        accessTier: string = "public"
    ): Promise<{ transactionHash: string; chain: "sui"; nftObjectId?: string }> => {
        if (!blobId || !account) {
            throw new Error("Missing blob ID or account");
        }

        setUploadStatus("Minting NFT...");

        const txb = new Transaction();
        const imageUrl = `${AGGREGATOR}/v1/blobs/${blobId}`;

        txb.moveCall({
            target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::mint`,
            arguments: [
                txb.pure.string(name),
                txb.pure.string(description),
                txb.pure.string(blobId),
                txb.pure.string(imageUrl),
                txb.pure.string(accessTier),
            ],
        });

        return new Promise((resolve, reject) => {
            signAndExecuteTransaction(
                {
                    transaction: txb,
                },
                {
                    onSuccess: async (result) => {
                        fetchBalances();

                        // Get the NFT object ID from the transaction
                        // The mint function transfers the NFT to the sender, so it should be in createdObjects
                        let nftObjectId: string | null = null;
                        try {
                            // Wait a bit for the transaction to be indexed
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Get the full transaction details
                            const txDetails = await suiClient.getTransactionBlock({
                                digest: result.digest,
                                options: {
                                    showEffects: true,
                                    showObjectChanges: true,
                                },
                            });

                            // Check object changes for created objects
                            if (txDetails.objectChanges) {
                                for (const change of txDetails.objectChanges) {
                                    if (change.type === 'created' && 'objectType' in change) {
                                        const objectType = change.objectType as string;
                                        if (objectType.includes('gallery_nft::GalleryNFT')) {
                                            nftObjectId = change.objectId;
                                            console.log('✅ NFT Created! Object ID:', nftObjectId);
                                            console.log('NFT Type:', objectType);
                                            break;
                                        }
                                    }
                                }
                            }

                            // Fallback: check effects.created if objectChanges didn't work
                            if (!nftObjectId && result.effects?.created) {
                                for (const created of result.effects.created) {
                                    const objectId = created.reference?.objectId || created.objectId;
                                    if (objectId) {
                                        try {
                                            const objectDetails = await suiClient.getObject({
                                                id: objectId,
                                                options: {
                                                    showType: true,
                                                    showContent: true,
                                                },
                                            });

                                            if (objectDetails.data?.type?.includes('gallery_nft::GalleryNFT')) {
                                                nftObjectId = objectId;
                                                console.log('✅ NFT Found! Object ID:', nftObjectId);
                                                break;
                                            }
                                        } catch (err) {
                                            // Skip objects that can't be fetched
                                            continue;
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Error fetching NFT object ID:', error);
                        }

                        resolve({
                            transactionHash: result.digest,
                            chain: "sui" as const,
                            nftObjectId: nftObjectId || undefined,
                        });
                    },
                    onError: (error) => {
                        console.error("Mint error:", error);
                        reject(error);
                    },
                }
            );
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

        if (!galleryTitle) {
            toast({
                title: "Gallery Title Required",
                description: "Please enter a gallery title",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        setUploadStatus("Uploading media to Walrus...");

        try {
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

                const blobId = imageUri
                    .replace("https://aggregator.walrus-testnet.walrus.space/v1/blobs/", "")
                    .replace("https://blob.walrus.testnet.space/", "");

                mediaUris.push({
                    name: mediaFile.name,
                    uri: imageUri,
                    blobId,
                    type: mediaFile.type,
                });
            }

            setUploadStatus(`Successfully uploaded ${selectedFiles.length} files to Walrus`);

            const galleryId = `sui_gallery_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;

            setUploadStatus("Creating gallery...");
            const { galleryUri, transactionHash } = await uploadGalleryToWalrus(
                galleryId,
                galleryTitle,
                galleryDescription || description,
                mediaUris,
                address!,
                visibility,
                "sui",
                {
                    type: "public",
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
                const requiresNFT = visibility === "private" || mintNFTForGallery;
                txb.moveCall({
                    target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::create_gallery`,
                    arguments: [
                        txb.pure.string(galleryId),
                        txb.pure.string(galleryTitle),
                        txb.pure.string(galleryDescription || description),
                        txb.pure.string(mediaUris[0]?.uri || ""),
                        txb.pure.u64(mediaUris.length),
                        txb.pure.bool(requiresNFT), // is_locked: true if NFT required for media
                        txb.pure.string(""), // required_nft (will be set if NFT is minted)
                        txb.pure.string("public"), // visibility: always public - galleries are visible to everyone
                        txb.pure.string(galleryUri),
                    ],
                });

                // Step 2: Mint NFT if requested (in the same transaction)
                let nftName: string | undefined;
                let nftDescription: string | undefined;
                let firstMediaBlobId: string | undefined;
                let imageUrl: string | undefined;

                if (mintNFTForGallery && visibility === "private") {
                    nftName = collectionName || `${galleryTitle} Access`;
                    nftDescription = `${collectionSymbol || `Access pass for gallery: ${galleryTitle}`}\n\nGallery URI: ${galleryUri}`;

                    const firstMedia = mediaUris[0];
                    if (firstMedia && firstMedia.blobId) {
                        firstMediaBlobId = firstMedia.blobId;
                        imageUrl = `${AGGREGATOR}/v1/blobs/${firstMediaBlobId}`;

                        // Add mint call to the same transaction
                        txb.moveCall({
                            target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::mint`,
                            arguments: [
                                txb.pure.string(nftName),
                                txb.pure.string(nftDescription),
                                txb.pure.string(firstMediaBlobId),
                                txb.pure.string(imageUrl),
                                txb.pure.string("exclusive"), // access_tier
                            ],
                        });
                    }
                }

                // Execute single transaction (one signature for everything)
                await new Promise<void>((resolve, reject) => {
                    signAndExecuteTransaction(
                        {
                            transaction: txb,
                        },
                        {
                            onSuccess: async (result) => {
                                console.log('✅ Gallery created on-chain (single transaction):', result.digest);

                                // Extract NFT object ID if minting was included
                                let nftObjectId: string | null = null;
                                if (mintNFTForGallery && visibility === "private") {
                                    try {
                                        await new Promise(resolve => setTimeout(resolve, 1000));

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

                                if (nftObjectId) {
                                    console.log('✅ NFT Created Successfully:', {
                                        objectId: nftObjectId,
                                        transactionHash: result.digest,
                                        name: nftName,
                                        description: nftDescription,
                                    });
                                }

                                resolve();
                            },
                            onError: (error) => {
                                console.error("Error creating gallery/NFT on-chain:", error);
                                toast({
                                    title: "Transaction Failed",
                                    description: `On-chain creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                                    variant: "destructive",
                                });
                                resolve(); // Resolve anyway so the process continues
                            },
                        }
                    );
                });
            } catch (error) {
                console.error("Error creating gallery on-chain:", error);
                toast({
                    title: "Warning",
                    description: `Gallery created in Walrus but on-chain creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                    variant: "destructive",
                });
            }

            // Gallery is now stored on-chain, no need for localStorage

            setUploadStatus(`✅ Gallery created successfully!`);
            toast({
                title: "Success!",
                description: `Gallery "${galleryTitle}" has been created. Redirecting...`,
            });

            // Redirect to home after a short delay
            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (error) {
            console.error("Upload error:", error);
            setUploadStatus(
                `❌ Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
            toast({
                title: "Upload Failed",
                description: `Failed to create gallery: ${error instanceof Error ? error.message : "Unknown error"
                    }`,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    if (!account) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-5">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">
                    Create Gallery & Mint NFT
                </h1>
                <ConnectButton />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-5">
            <div className="max-w-4xl mx-auto font-sans">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/")}
                    className="mb-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Galleries
                </Button>

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        🎨 Create Gallery & Mint NFT
                    </h1>
                    <p className="text-gray-600 mb-1">Upload your media and create an NFT-gated gallery</p>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium mt-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Connected: {account.address.slice(0, 8)}...{account.address.slice(-4)}
                    </div>
                </div>

                {/* Balance Display */}
                <div className="mb-6 p-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg">
                    <div className="grid grid-cols-2 gap-6 text-center">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                            <div className="flex items-center justify-center mb-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-white font-bold text-sm">W</span>
                                </div>
                                <p className="text-sm font-medium text-gray-600">WAL Balance</p>
                            </div>
                            <p className="text-3xl font-bold text-blue-600">{walBalance}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                            <div className="flex items-center justify-center mb-2">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-2">
                                    <span className="text-white font-bold text-sm">S</span>
                                </div>
                                <p className="text-sm font-medium text-gray-600">SUI Balance</p>
                            </div>
                            <p className="text-3xl font-bold text-green-600">{suiBalance}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchBalances}
                        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium"
                    >
                        🔄 Refresh Balances
                    </button>

                    {parseFloat(walBalance) < 0.01 && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                        <span className="text-red-600 text-lg">⚠️</span>
                                    </div>
                                </div>
                                <div className="ml-3 flex-1">
                                    <h3 className="text-red-800 font-bold text-sm mb-1">Low WAL Balance</h3>
                                    <p className="text-red-700 text-xs mb-2">
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

                {/* Status Display */}
                {uploadStatus && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-blue-800 font-medium">
                            <span className="font-bold">Status:</span> {uploadStatus}
                        </p>
                    </div>
                )}

                {/* Upload Section */}
                <section className="mb-8 p-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">
                            📤 Upload Media Files
                        </h2>
                        <p className="text-gray-600">Choose files to upload to decentralized storage</p>
                    </div>

                    <div
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center transition-all duration-300 hover:border-primary hover:bg-primary/5 cursor-pointer"
                        onDrop={(e) => {
                            e.preventDefault();
                            handleFileSelect(e.dataTransfer.files);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-xl font-semibold mb-2">Drag & Drop Files Here</p>
                        <p className="text-sm text-gray-500 mb-4">or</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*,audio/*"
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                            id="file-upload"
                        />
                        <label
                            htmlFor="file-upload"
                            className="inline-flex items-center px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 cursor-pointer text-base font-semibold"
                        >
                            <Upload className="w-5 h-5 mr-2" />
                            Choose Files
                        </label>
                        <div className="flex items-center justify-center gap-2 pt-4 mt-4">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            <Video className="w-4 h-4 text-gray-400" />
                            <Music className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">Images, Videos, Audio</span>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {selectedFiles.length} {selectedFiles.length === 1 ? "File" : "Files"} Selected
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedFiles([]);
                                        setFilePreviews({});
                                    }}
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
                                            className="relative group rounded-lg overflow-hidden border border-gray-200"
                                        >
                                            {isImage && preview ? (
                                                <img
                                                    src={preview}
                                                    alt={file.name}
                                                    className="w-full h-32 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                                                    {getFileIcon(file)}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1 text-xs truncate">
                                                {file.name}
                                            </div>
                                            <Badge className="absolute top-1 right-1 text-xs">
                                                {formatFileSize(file.size)}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* Gallery Settings */}
                <section className="mb-8 p-8 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">
                            🖼️ Gallery Settings
                        </h2>
                        <p className="text-gray-600">Configure your gallery details</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="galleryTitle" className="text-base font-semibold">
                                Gallery Title *
                            </Label>
                            <Input
                                id="galleryTitle"
                                placeholder="e.g., My Photography Collection"
                                value={galleryTitle}
                                onChange={(e) => setGalleryTitle(e.target.value)}
                                className="h-12 text-base mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="galleryDescription" className="text-base font-semibold">
                                Gallery Description
                            </Label>
                            <Textarea
                                id="galleryDescription"
                                placeholder="Describe your gallery theme, inspiration, and content..."
                                value={galleryDescription}
                                onChange={(e) => setGalleryDescription(e.target.value)}
                                className="min-h-[120px] resize-none text-base mt-2"
                            />
                        </div>

                        <div>
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Visibility
                            </Label>
                            <Select
                                value={visibility}
                                onValueChange={(value: "public" | "private") => setVisibility(value)}
                            >
                                <SelectTrigger className="h-12 text-base mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">
                                        <div className="flex items-center space-x-2">
                                            <Globe className="w-4 h-4 text-green-500" />
                                            <span>🌍 Public (Free Access)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="private">
                                        <div className="flex items-center space-x-2">
                                            <Lock className="w-4 h-4 text-orange-500" />
                                            <span>👑 Exclusive (VIP Only)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </section>

                {/* NFT Minting Section */}
                {visibility === "private" && (
                    <section className="mb-8 p-8 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-lg">
                        <div className="flex items-start space-x-4 mb-6">
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
                                <p className="text-sm text-gray-600 mt-1">
                                    Create a unique NFT that grants exclusive access to your private gallery
                                </p>
                            </div>
                        </div>

                        {mintNFTForGallery && (
                            <div className="space-y-6 mt-6">
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-green-800 mb-2">
                                        🎨 Mint Your NFT
                                    </h3>
                                    <p className="text-green-600">Create your unique NFT tied to this gallery</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="collectionName" className="text-sm font-semibold">
                                            NFT Name *
                                        </Label>
                                        <Input
                                            id="collectionName"
                                            placeholder="e.g., Gallery Access Pass"
                                            value={collectionName}
                                            onChange={(e) => setCollectionName(e.target.value)}
                                            className="h-12 text-base"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nftDescription" className="text-sm font-semibold">
                                            Description *
                                        </Label>
                                        <Input
                                            id="nftDescription"
                                            placeholder="Describe your NFT..."
                                            value={collectionSymbol}
                                            onChange={(e) => setCollectionSymbol(e.target.value)}
                                            className="h-12 text-base"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-white/60 rounded-xl border border-green-200">
                                    <p className="text-sm text-gray-600 text-center">
                                        <span className="font-semibold text-green-700">ℹ️</span> This will create a
                                        unique NFT that can gate access to your gallery and be traded on Sui
                                        marketplaces
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => navigate("/")} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button
                        variant="gradient"
                        onClick={handleUpload}
                        disabled={
                            isUploading ||
                            selectedFiles.length === 0 ||
                            !galleryTitle ||
                            !isConnected
                        }
                        className="px-8 text-base font-semibold"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Creating Gallery...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Create Gallery
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default CreateGallery;

