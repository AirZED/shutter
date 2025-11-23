import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { SuiWalletConnect } from "./SuiWalletConnect";
import { SolanaWalletConnect } from "./SolanaWalletConnect";
import { useState } from "react";

interface WalletConnectProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WalletConnect = ({ open, onOpenChange }: WalletConnectProps) => {
    const {
        isConnected,
        address,
        chain,
        isConnecting,
        error,
        disconnectWallet
    } = useWallet();

    const [selectedChain, setSelectedChain] = useState<'solana' | 'sui'>('solana');
    const [suiConnected, setSuiConnected] = useState(false);
    const [solanaConnected, setSolanaConnected] = useState(false);

    const handleSuiConnectionChange = (connected: boolean, addr?: string) => {
        setSuiConnected(connected);
        if (connected) {
            onOpenChange(false);
        }
    };

    const handleSolanaConnectionChange = (connected: boolean, addr?: string) => {
        setSolanaConnected(connected);
        if (connected) {
            onOpenChange(false);
        }
    };

    const handleDisconnect = () => {
        disconnectWallet();
        setSuiConnected(false);
        setSolanaConnected(false);
        onOpenChange(false);
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const isAnyConnected = isConnected || suiConnected || solanaConnected;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        {isAnyConnected ? 'Wallet Connected' : 'Connect Wallet'}
                    </DialogTitle>
                    <DialogDescription>
                        {isAnyConnected
                            ? 'Your wallet is connected and ready to use'
                            : 'Connect your wallet to access NFT-protected galleries'
                        }
                    </DialogDescription>
                </DialogHeader>

                {isAnyConnected ? (
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
                                {chain?.toUpperCase() || 'CONNECTED'}
                            </Badge>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const explorerUrl = chain === 'solana'
                                        ? `https://explorer.solana.com/address/${address}`
                                        : `https://suiexplorer.com/address/${address}`;
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
                        <Tabs value={selectedChain} onValueChange={(value) => setSelectedChain(value as 'solana' | 'sui')}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="solana">Solana</TabsTrigger>
                                <TabsTrigger value="sui">Sui</TabsTrigger>
                            </TabsList>

                            <TabsContent value="solana" className="space-y-4">
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-white">S</span>
                                    </div>
                                    <h3 className="font-semibold">Solana Network</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Connect with Phantom, Solflare, or other Solana wallets
                                    </p>
                                    <SolanaWalletConnect onConnectionChange={handleSolanaConnectionChange} />
                                </div>
                            </TabsContent>

                            <TabsContent value="sui" className="space-y-4">
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
                            </TabsContent>
                        </Tabs>

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
