import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import Index from "./pages/Index";
import GalleryDetail from "./pages/GalleryDetail";
import NotFound from "./pages/NotFound";
import CreateGallery from "./pages/CreateGallery";
import InitDisplay from "./pages/InitDisplay";

// Sui Imports
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider as SuiWalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import "@mysten/dapp-kit/dist/index.css";

import Mint from "./pages/MInt";

const queryClient = new QueryClient();
const { networkConfig } = createNetworkConfig({
  devnet: { url: getFullnodeUrl("devnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <SuiWalletProvider autoConnect={true}>
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/gallery/:id" element={<GalleryDetail />} />
                <Route path="/mint" element={<Mint />} />
                <Route path="/create" element={<CreateGallery />} />
                <Route path="/init-display" element={<InitDisplay />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WalletProvider>
      </SuiWalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default App;
