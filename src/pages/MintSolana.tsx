import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"; // Revert: Use bundle for defaults
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  createGenericFile,
  generateSigner,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createProgrammableNft } from "@metaplex-foundation/mpl-token-metadata";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MintSolana: React.FC = () => {
  const wallet = useWallet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nftName, setNftName] = useState("My Custom NFT");
  const [nftDescription, setNftDescription] = useState(
    "Minted via React app on Solana devnet"
  );
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState("");

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setStatus("");
    }
  };

  const mintNft = async () => {
    if (!selectedFile || !wallet.publicKey || !wallet.signTransaction) {
      setStatus("Connect wallet and select an image first.");
      return;
    }

    setIsMinting(true);
    setStatus("Starting upload and mint...");

    try {
      // Setup UMI with bundle defaults (includes program repo)
      const umi = createUmi(endpoint)
        .use(mplTokenMetadata())
        .use(irysUploader({ address: "https://devnet.irys.xyz" }))
        .use(walletAdapterIdentity(wallet));

      // Read image file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      // Create generic file for upload
      const umiImageFile = createGenericFile(imageBuffer, selectedFile.name, {
        tags: [
          { name: "Content-Type", value: selectedFile.type || "image/jpeg" },
        ],
      });

      setStatus("Uploading image to Arweave...");
      const [imageUri] = await umi.uploader.upload([umiImageFile]);
      setStatus(`Image uploaded: ${imageUri}`);

      // Create metadata
      const metadata = {
        name: nftName,
        description: nftDescription,
        image: imageUri,
        attributes: [{ trait_type: "Type", value: "Custom" }],
        properties: {
          files: [{ uri: imageUri, type: selectedFile.type || "image/jpeg" }],
          category: "image",
        },
      };

      setStatus("Uploading metadata...");
      const metadataUri = await umi.uploader.uploadJson(metadata);
      setStatus(`Metadata uploaded: ${metadataUri}`);

      // Mint pNFT
      setStatus("Minting NFT...");
      const mintSigner = generateSigner(umi);
      const { signature } = await createProgrammableNft(umi, {
        mint: mintSigner,
        name: metadata.name,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(5.5), // 5.5% royalty
      }).sendAndConfirm(umi);

      const sig = base58.deserialize(signature)[0];
      setStatus(
        `Success! View tx: https://explorer.solana.com/tx/${sig}?cluster=devnet`
      );
      setStatus(`NFT address: ${mintSigner.publicKey}`);
    } catch (error) {
      console.error(error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Solana NFT Minter (Devnet)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <WalletMultiButton className="mb-2" />
            {wallet.publicKey && (
              <p className="text-sm text-muted-foreground">
                Connected: {wallet.publicKey.toBase58()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">NFT Name</label>
            <Input
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              placeholder="Enter NFT name"
              className="mb-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <Input
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              placeholder="Enter description"
              className="mb-2"
            />
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
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <Button
            onClick={mintNft}
            disabled={
              !selectedFile ||
              !wallet.publicKey ||
              !wallet.signTransaction ||
              isMinting
            }
            className="w-full"
          >
            {isMinting ? "Minting..." : "Upload & Mint NFT"}
          </Button>

          {status && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm">{status}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MintSolana;
