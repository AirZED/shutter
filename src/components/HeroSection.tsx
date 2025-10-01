import { Button } from "@/components/ui/button";
import { Shield, Lock, Zap } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-12">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroBanner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative glass-card border p-12 text-center space-y-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Decentralized Media Vault
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Store, protect, and share your media with NFT-gated access control. Your content, your rules.
        </p>
        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm">Decentralized</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            <span className="text-sm">NFT-Gated</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-secondary" />
            <span className="text-sm">Fast Access</span>
          </div>
        </div>
        <Button variant="gradient" size="lg" onClick={onGetStarted}>
          Get Started
        </Button>
      </div>
    </div>
  );
};
