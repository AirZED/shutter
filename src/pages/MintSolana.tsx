import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  generateSigner,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createProgrammableNft } from "@metaplex-foundation/mpl-token-metadata";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";

const MintSolana: React.FC = () => {
  const wallet = useWallet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nftName, setNftName] = useState("My Custom NFT");
  const [nftSymbol, setNftSymbol] = useState("WALRUS");
  const [nftDescription, setNftDescription] = useState(
    "Minted via React app on Solana testnet"
  );
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [blobId, setBlobId] = useState<string>("");
  const [copiedItem, setCopiedItem] = useState<string>("");

  const network = WalletAdapterNetwork.Testnet;
  const endpoint = clusterApiUrl(network);
  
  // Walrus configuration
  const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
  const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setStatus("");
      setBlobId(""); // Reset blob ID when new file is selected
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload to Walrus first
  const uploadToWalrus = async () => {
    if (!selectedFile) {
      setStatus("Please select a file first");
      return false;
    }

    setStatus("📤 Uploading image to Walrus...");

    try {
      const response = await axios.put(
        `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
        selectedFile,
        {
          headers: {
            "Content-Type": selectedFile.type || "image/jpeg",
          },
        }
      );

      const result = response.data;
      let uploadedBlobId = "";

      if (result.newlyCreated) {
        uploadedBlobId = result.newlyCreated.blobObject.blobId;
        setStatus(`✅ Image uploaded! Blob ID: ${uploadedBlobId}`);
      } else if (result.alreadyCertified) {
        uploadedBlobId = result.alreadyCertified.blobId;
        setStatus(`✅ Image exists! Blob ID: ${uploadedBlobId}`);
      }

      setBlobId(uploadedBlobId);
      return uploadedBlobId;
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setStatus(`❌ Upload failed: ${errorMessage}`);
      return false;
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(""), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const mintNft = async () => {
    if (!selectedFile || !wallet.publicKey || !wallet.signTransaction) {
      setStatus("❌ Connect wallet and select an image first.");
      return;
    }

    // Check SOL balance before minting
    try {
      const connection = new Connection(endpoint);
      const balance = await connection.getBalance(wallet.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      if (solBalance < 0.01) {
        setStatus(`❌ Insufficient SOL balance: ${solBalance.toFixed(4)} SOL\n\nGet SOL from: https://faucet.solana.com/`);
        return;
      }
      
      setStatus(`💰 Balance check: ${solBalance.toFixed(4)} SOL ✓`);
    } catch (error) {
      setStatus(`❌ Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }

    setIsMinting(true);

    try {
      // Step 1: Upload image to Walrus (if not already uploaded)
      let uploadedBlobId = blobId;
      if (!uploadedBlobId) {
        uploadedBlobId = await uploadToWalrus();
        if (!uploadedBlobId) {
          throw new Error("Failed to upload image to Walrus");
        }
      }

      // Construct Walrus URLs
      const imageUrl = `${AGGREGATOR}/v1/blobs/${uploadedBlobId}`;

      // Step 2: Create and upload metadata JSON to Walrus
      setStatus("📝 Creating metadata...");
      const metadata = {
        name: nftName,
        symbol: nftSymbol,
        description: nftDescription,
        image: imageUrl,
        attributes: [
          { trait_type: "Type", value: "Creator Content" },
          { trait_type: "Storage", value: "Walrus" },
          { trait_type: "Symbol", value: nftSymbol },
        ],
        properties: {
          files: [{ uri: imageUrl, type: selectedFile.type || "image/jpeg" }],
          category: "image",
        },
      };

      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: "application/json",
      });

      setStatus("📤 Uploading metadata to Walrus...");
      const metadataResponse = await axios.put(
        `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
        metadataBlob,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const metadataResult = metadataResponse.data;
      let metadataBlobId = "";

      if (metadataResult.newlyCreated) {
        metadataBlobId = metadataResult.newlyCreated.blobObject.blobId;
      } else if (metadataResult.alreadyCertified) {
        metadataBlobId = metadataResult.alreadyCertified.blobId;
      }

      const metadataUri = `${AGGREGATOR}/v1/blobs/${metadataBlobId}`;
      setStatus(`✅ Metadata uploaded: ${metadataUri}`);

      // Step 3: Mint NFT on Solana with Walrus metadata
      setStatus("🎨 Minting NFT on Solana...");
      const umi = createUmi(endpoint)
        .use(mplTokenMetadata())
        .use(walletAdapterIdentity(wallet));

      const mintSigner = generateSigner(umi);
      const { signature } = await createProgrammableNft(umi, {
        mint: mintSigner,
        name: metadata.name,
        symbol: nftSymbol, // Adding symbol to fix "NO SYMBOL WAS FOUND" issue
        uri: metadataUri, // Using Walrus URL instead of Arweave!
        sellerFeeBasisPoints: percentAmount(5.5),
      }).sendAndConfirm(umi);

      const sig = base58.deserialize(signature)[0];
      setStatus(
        `🎉 Success! NFT Minted!\n\nTransaction: https://explorer.solana.com/tx/${sig}?cluster=testnet\n\nNFT Address: ${mintSigner.publicKey}`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            🔷 Solana NFT Minter with Walrus Storage
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Mint NFTs on Solana Testnet using Walrus for decentralized storage
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <WalletMultiButton className="mb-2" />
            {wallet.publicKey && (
              <p className="text-sm text-green-600 font-medium">
                ✅ Connected: {wallet.publicKey.toBase58().slice(0, 8)}...
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Image File</label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mb-2"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                📁 Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-semibold mb-2">Preview:</p>
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded"
              />
            </div>
          )}

          {/* Upload to Walrus button (optional step) */}
          {selectedFile && !blobId && (
            <Button
              onClick={uploadToWalrus}
              disabled={isMinting}
              variant="outline"
              className="w-full"
            >
              📤 Upload to Walrus (Optional)
            </Button>
          )}

          {/* Show uploaded blob info */}
          {blobId && (
            <div className="border border-green-300 rounded-lg p-3 bg-green-50">
              <p className="text-sm font-semibold text-green-800 mb-1">
                ✅ Uploaded to Walrus
              </p>
              <p className="text-xs text-gray-600 break-all">
                Blob ID: {blobId}
              </p>
              <a
                href={`${AGGREGATOR}/v1/blobs/${blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View on Walrus →
              </a>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">NFT Name</label>
            <Input
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              placeholder="e.g., My Amazing Artwork"
              className="mb-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">NFT Symbol</label>
            <Input
              value={nftSymbol}
              onChange={(e) => setNftSymbol(e.target.value)}
              placeholder="e.g., WALRUS, MYNFT, ART"
              className="mb-2"
              maxLength={10}
            />
            <p className="text-xs text-gray-500">Short symbol for your NFT (max 10 characters)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <Textarea
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              placeholder="Describe your NFT..."
              className="min-h-[80px] resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={mintNft}
            disabled={
              !selectedFile ||
              !wallet.publicKey ||
              !wallet.signTransaction ||
              isMinting
            }
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isMinting ? "⏳ Minting..." : "🚀 Mint NFT on Solana"}
          </Button>

          {status && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg shadow-lg animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                {status.includes("🎉 Success!") ? (
                  <div>
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-2 animate-bounce">🎉</span>
                      <h3 className="text-lg font-bold text-green-800">NFT Successfully Minted!</h3>
                    </div>
                    <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded-md">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ Your NFT has been successfully minted on Solana Testnet!
                      </p>
                    </div>
                    <div className="space-y-2">
                      {status.split('\n').map((line, index) => {
                        if (line.includes('https://explorer.solana.com/tx/')) {
                          const url = line.replace('Transaction: ', '').trim();
                          return (
                            <div key={index} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">🔗 Transaction Hash:</p>
                                <button
                                  onClick={() => copyToClipboard(url, 'transaction')}
                                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors duration-200"
                                >
                                  {copiedItem === 'transaction' ? '✓ Copied!' : '📋 Copy'}
                                </button>
                              </div>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-blue-100 hover:bg-blue-200 rounded border text-blue-800 text-xs break-all transition-colors duration-200"
                              >
                                {url}
                              </a>
                            </div>
                          );
                        } else if (line.includes('NFT Address:')) {
                          const nftAddress = line.replace('NFT Address: ', '').trim();
                          return (
                            <div key={index} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">🪙 NFT Address:</p>
                                <button
                                  onClick={() => copyToClipboard(nftAddress, 'nft')}
                                  className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors duration-200"
                                >
                                  {copiedItem === 'nft' ? '✓ Copied!' : '📋 Copy'}
                                </button>
                              </div>
                              <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all text-gray-800">
                                {nftAddress}
                              </p>
                            </div>
                          );
                        } else if (line.trim() && !line.includes('🎉 Success!')) {
                          return (
                            <p key={index} className="text-sm text-gray-700">
                              {line}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-xl mr-2">⚠️</span>
                      <h3 className="text-lg font-bold text-red-800">Error</h3>
                    </div>
                    <p className="text-sm whitespace-pre-line text-red-700">{status}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-center text-gray-500 mt-4">
            <p>💡 This will upload your image and metadata to Walrus,</p>
            <p>then mint an NFT on Solana that references the Walrus URLs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MintSolana;
