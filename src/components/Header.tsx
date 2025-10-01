import { Button } from "@/components/ui/button";
import { Upload, Wallet } from "lucide-react";

interface HeaderProps {
  onUploadClick: () => void;
  onConnectWallet: () => void;
  isWalletConnected: boolean;
}

export const Header = ({ onUploadClick, onConnectWallet, isWalletConnected }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 glass-card border-b backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center font-bold text-lg">
            V
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            VaultMedia
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="glass" size="sm" onClick={onUploadClick}>
            <Upload className="w-4 h-4" />
            Upload
          </Button>
          <Button
            variant={isWalletConnected ? "secondary" : "gradient"}
            size="sm"
            onClick={onConnectWallet}
          >
            <Wallet className="w-4 h-4" />
            {isWalletConnected ? "0x1234...5678" : "Connect Wallet"}
          </Button>
        </div>
      </div>
    </header>
  );
};
