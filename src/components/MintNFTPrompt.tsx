import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lock, Sparkles, Loader2, CheckCircle, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";
import { useWallet } from "@/contexts/WalletContext";

interface MintNFTPromptProps {
    galleryTitle: string;
    requiredNFT?: string;
    onMintSuccess?: () => void;
    onCancel?: () => void;
}

export const MintNFTPrompt = ({
    galleryTitle,
    requiredNFT,
    onMintSuccess,
    onCancel,
}: MintNFTPromptProps) => {
    const account = useCurrentAccount();
    const { connection, connectWallet } = useWallet();
    const { mutate: signAndExecuteTransaction, isPending } = useSignAndExecuteTransaction();
    const { toast } = useToast();
    const [nftName, setNftName] = useState(`${galleryTitle} Access Pass`);
    const [nftDescription, setNftDescription] = useState(
        `Access pass for ${galleryTitle}. This NFT grants you exclusive access to view and interact with the gallery content.`
    );
    const [mintStatus, setMintStatus] = useState<string>("");

    const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
    const isWalletConnected = connection?.isConnected || false;

    const handleMint = async () => {
        // Check if wallet is connected first
        if (!isWalletConnected || !account) {
            toast({
                title: "Wallet Not Connected",
                description: "Please connect your wallet to mint the NFT.",
                variant: "destructive",
            });
            // Try to connect wallet
            if (connectWallet) {
                try {
                    await connectWallet();
                } catch (error) {
                    console.error("Error connecting wallet:", error);
                }
            }
            return;
        }

        if (!nftName.trim() || !nftDescription.trim()) {
            toast({
                title: "Error",
                description: "Please fill in NFT name and description",
                variant: "destructive",
            });
            return;
        }

        setMintStatus("Minting NFT...");

        const txb = new Transaction();

        // Use a default image URL for the access pass NFT
        // In a real scenario, you might want to upload a custom image
        const defaultImageUrl = "https://via.placeholder.com/512/6366f1/ffffff?text=Access+Pass";

        txb.moveCall({
            target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::mint`,
            arguments: [
                txb.pure.string(nftName),
                txb.pure.string(nftDescription),
                txb.pure.string(""), // walrus_blob_id (empty for default image)
                txb.pure.string(defaultImageUrl),
                txb.pure.string("exclusive"), // access_tier
            ],
        });

        signAndExecuteTransaction(
            {
                transaction: txb,
            },
            {
                onSuccess: async (result) => {
                    setMintStatus("✅ NFT minted successfully!");

                    // Wait a moment for the transaction to be indexed
                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    // Verify the NFT was created
                    try {
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

                        const createdObjects = txDetails.objectChanges?.filter(
                            (change: any) =>
                                change.type === "created" &&
                                change.objectType?.includes("GalleryNFT")
                        );

                        if (createdObjects && createdObjects.length > 0) {
                            const nftObjectId = createdObjects[0].objectId;
                            toast({
                                title: "NFT Minted Successfully!",
                                description: "Your access pass has been created. Verifying access...",
                                action: (
                                    <a
                                        href={`https://testnet.suivision.xyz/object/${nftObjectId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm"
                                    >
                                        View NFT
                                    </a>
                                ),
                            });

                            // Call success callback after a short delay to allow verification
                            setTimeout(() => {
                                if (onMintSuccess) {
                                    onMintSuccess();
                                }
                            }, 3000);
                        } else {
                            toast({
                                title: "NFT Minted",
                                description: "Transaction completed. Please wait a moment and refresh to verify access.",
                            });
                            if (onMintSuccess) {
                                setTimeout(() => onMintSuccess(), 3000);
                            }
                        }
                    } catch (error) {
                        console.error("Error verifying NFT:", error);
                        toast({
                            title: "NFT Minted",
                            description: "Transaction completed. Please refresh the page to verify access.",
                        });
                        if (onMintSuccess) {
                            setTimeout(() => onMintSuccess(), 3000);
                        }
                    }
                },
                onError: (error) => {
                    console.error("Mint error:", error);
                    setMintStatus("❌ Minting failed");
                    toast({
                        title: "Minting Failed",
                        description: error instanceof Error ? error.message : "Unknown error occurred",
                        variant: "destructive",
                    });
                },
            }
        );
    };

    return (
        <Card className="border-2 border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Mint Access Pass NFT</CardTitle>
                        <CardDescription>
                            This gallery requires an NFT to access. Mint your access pass to continue.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                        <strong>Gallery:</strong> {galleryTitle}
                    </p>
                    {requiredNFT && (
                        <p className="text-sm text-muted-foreground mt-1">
                            <strong>Required NFT:</strong> {requiredNFT.slice(0, 20)}...
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="nft-name">NFT Name *</Label>
                    <Input
                        id="nft-name"
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        placeholder="Access Pass Name"
                        disabled={isPending}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="nft-description">Description *</Label>
                    <Textarea
                        id="nft-description"
                        value={nftDescription}
                        onChange={(e) => setNftDescription(e.target.value)}
                        placeholder="Describe your access pass..."
                        rows={3}
                        disabled={isPending}
                    />
                </div>

                {mintStatus && (
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">{mintStatus}</p>
                    </div>
                )}

                {!isWalletConnected && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Wallet className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                    Wallet Not Connected
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                    Please connect your wallet to mint an access pass NFT.
                                </p>
                                {connectWallet && (
                                    <Button
                                        onClick={connectWallet}
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                    >
                                        <Wallet className="mr-2 h-3 w-3" />
                                        Connect Wallet
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button
                        onClick={handleMint}
                        disabled={isPending || !isWalletConnected || !nftName.trim() || !nftDescription.trim()}
                        className="flex-1"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Minting...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                {isWalletConnected ? "Mint Access Pass" : "Connect Wallet First"}
                            </>
                        )}
                    </Button>
                    {onCancel && (
                        <Button onClick={onCancel} variant="outline" disabled={isPending}>
                            Cancel
                        </Button>
                    )}
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Note:</strong> After minting, your wallet will receive an NFT that grants access to this gallery.
                        The transaction may take a few moments to process.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

