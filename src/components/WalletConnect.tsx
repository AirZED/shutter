import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { SuiWalletConnect } from "./SuiWalletConnect";

interface WalletConnectProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConnect: () => Promise<void>;
    onDisconnect: () => void;
    isConnected: boolean;
    currentChain: "sui" | null;
    address: string | null;
    isConnecting: boolean;
    error: string | null;
}

export const WalletConnect = ({
    open,
    onOpenChange,
    onConnect,
    onDisconnect,
    isConnected,
    currentChain,
    address,
    isConnecting,
    error
}: WalletConnectProps) => {
    const handleSuiConnectionChange = (connected: boolean, addr?: string) => {
        if (connected) {
            onConnect();
        }
    };

    const handleDisconnect = () => {
        onDisconnect();
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                    </DialogTitle>
                    <DialogDescription>
                        {isConnected
                            ? 'Your wallet is connected and ready to use'
                            : 'Connect your wallet to access NFT-protected galleries'
                        }
                    </DialogDescription>
                </DialogHeader>

                {isConnected ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-900 dark:text-green-100">
                                        Wallet Connected
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300 font-mono">
                                        {address ? formatAddress(address) : 'Connected'}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {currentChain?.toUpperCase() || 'CONNECTED'}
                            </Badge>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const explorerUrl = `https://suiexplorer.com/address/${address}`;
                                    window.open(explorerUrl, '_blank');
                                }}
                                className="flex-1"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View on Explorer
                            </Button>
                            <Button variant="destructive" onClick={handleDisconnect}>
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">S</span>
                            </div>
                            <h3 className="font-semibold">Sui Network</h3>
                            <p className="text-sm text-muted-foreground">
                                Connect with Sui Wallet or other Sui-compatible wallets
                            </p>
                            <SuiWalletConnect onConnectionChange={handleSuiConnectionChange} />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                                <XCircle className="w-4 h-4 text-red-600" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
