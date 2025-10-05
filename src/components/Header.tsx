import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Wallet, ExternalLink } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useState } from "react";
import { WalletConnect } from "./WalletConnect";

interface HeaderProps {
  onUploadClick: () => void;
}

export const Header = ({ onUploadClick }: HeaderProps) => {
  const { isConnected, address, chain, disconnectWallet } = useWallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleWalletClick = () => {
    if (isConnected) {
      // Show wallet info or disconnect
      setIsWalletModalOpen(true);
    } else {
      // Connect wallet
      setIsWalletModalOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-card border-b backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/logo.jpeg" alt="" className="h-8 w-8" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Shutter
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="glass" size="sm" onClick={onUploadClick}>
              <Upload className="w-4 h-4" />
              Upload
            </Button>
            {isConnected && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {chain?.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://explorer.solana.com/address/${address}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button
              variant={isConnected ? "secondary" : "gradient"}
              size="sm"
              onClick={handleWalletClick}
            >
              <Wallet className="w-4 h-4" />
              {isConnected ? formatAddress(address!) : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </header>

      <WalletConnect
        open={isWalletModalOpen}
        onOpenChange={setIsWalletModalOpen}
      />
    </>
  );
};
