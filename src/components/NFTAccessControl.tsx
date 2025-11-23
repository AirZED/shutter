import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

interface NFTAccessControlProps {
    collectionAddress: string;
    requiredTraits?: Record<string, string>;
    onAccessGranted?: () => void;
    onAccessDenied?: () => void;
}

export const NFTAccessControl = ({
    collectionAddress,
    requiredTraits,
    onAccessGranted,
    onAccessDenied
}: NFTAccessControlProps) => {
    const { isConnected, chain, verifyNFT, nftVerification } = useWallet();
    const [isCheckingAccess, setIsCheckingAccess] = useState(false);

    useEffect(() => {
        if (isConnected && collectionAddress) {
            checkAccess();
        }
    }, [isConnected, collectionAddress]);

    const checkAccess = async () => {
        if (!isConnected) return;

        setIsCheckingAccess(true);
        try {
            await verifyNFT(collectionAddress, requiredTraits);
        } catch (error) {
            console.error('Error checking NFT access:', error);
        } finally {
            setIsCheckingAccess(false);
        }
    };

    const hasAccess = nftVerification.verificationResult?.ownsNFT || false;
    const nftMetadata = nftVerification.verificationResult?.nftMetadata;
    const traits = nftVerification.verificationResult?.traits;

    if (!isConnected) {
        return (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Please connect your wallet to verify NFT ownership and access this gallery.
                </AlertDescription>
            </Alert>
        );
    }

    if (isCheckingAccess || nftVerification.isVerifying) {
        return (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                                Verifying NFT Access
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Checking your wallet for required NFTs...
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (nftVerification.error) {
        return (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                    Error verifying NFT access: {nftVerification.error}
                </AlertDescription>
            </Alert>
        );
    }

    if (hasAccess) {
        // Call access granted callback
        if (onAccessGranted) {
            onAccessGranted();
        }

        return (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-green-900 dark:text-green-100">
                            Access Granted
                        </CardTitle>
                    </div>
                    <CardDescription className="text-green-700 dark:text-green-300">
                        You have the required NFT to access this gallery.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {nftMetadata && (
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                                    Your NFT: {nftMetadata.name}
                                </h4>
                                {nftMetadata.description && (
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        {nftMetadata.description}
                                    </p>
                                )}
                            </div>

                            {traits && Object.keys(traits).length > 0 && (
                                <div>
                                    <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
                                        NFT Traits:
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(traits).map(([trait, value]) => (
                                            <Badge
                                                key={trait}
                                                variant="secondary"
                                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                            >
                                                {trait}: {value}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Access denied
    if (onAccessDenied) {
        onAccessDenied();
    }

    return (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <CardTitle className="text-red-900 dark:text-red-100">
                        Access Denied
                    </CardTitle>
                </div>
                <CardDescription className="text-red-700 dark:text-red-300">
                    You don't have the required NFT to access this gallery.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900 dark:text-red-100">
                            Required: {chain?.toUpperCase()} NFT Collection
                        </span>
                    </div>

                    {requiredTraits && Object.keys(requiredTraits).length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                                Required Traits:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(requiredTraits).map(([trait, value]) => (
                                    <Badge
                                        key={trait}
                                        variant="destructive"
                                    >
                                        {trait}: {value}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkAccess}
                        className="w-full"
                    >
                        Recheck Access
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
