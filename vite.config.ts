import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";  // New: Polyfill import

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), nodePolyfills(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    global: 'globalThis',
    'process.env': {},  // Handles env checks in deps
  },
  optimizeDeps: {
    include: [
      '@solana/web3.js',
      '@metaplex-foundation/umi',
      '@metaplex-foundation/mpl-token-metadata',
      '@metaplex-foundation/umi-uploader-irys',
      '@metaplex-foundation/umi-rpc-web3js',
      'buffer',  // If needed for serialization
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));