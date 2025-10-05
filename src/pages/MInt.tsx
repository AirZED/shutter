import React, { useState, useEffect } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  ConnectButton,
} from "@mysten/dapp-kit";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

function Mint() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [blobId, setBlobId] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Connect wallet to start");
  const [nftName, setNftName] = useState("My Walrus NFT");
  const [nftDescription, setNftDescription] = useState(
    "Minted with image on Walrus!"
  );
  const [walBalance, setWalBalance] = useState<string>("0");
  const [suiBalance, setSuiBalance] = useState<string>("0");

  const suiClient = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });

  const PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
  const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

  const WAL_TYPE =
    "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";

  // Fetch balances
  const fetchBalances = async () => {
    if (!account) return;
    try {
      const [walBal, suiBal] = await Promise.all([
        suiClient.getBalance({
          owner: account.address,
          coinType: WAL_TYPE,
        }),
        suiClient.getBalance({
          owner: account.address,
        }),
      ]);

      setWalBalance((Number(walBal.totalBalance) / 1e9).toFixed(4));
      setSuiBalance((Number(suiBal.totalBalance) / 1e9).toFixed(4));
    } catch (error) {
      console.error("Balance fetch failed:", error);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [account]);

  // Handle file upload using HTTP API
  const handleUpload = async () => {
    if (!selectedFile || !account) return;

    setUploadStatus("Uploading to Walrus...");

    try {
      // Upload to Walrus publisher
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${PUBLISHER}/v1/blobs?epochs=5&deletable=true`,
        {
          method: "PUT",
          body: selectedFile,
          headers: {
            "Content-Type": selectedFile.type || "application/octet-stream",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("Upload result:", result);

      if (result.newlyCreated) {
        const blob = result.newlyCreated.blobObject;
        setBlobId(blob.blobId);
        setUploadStatus(`Upload successful! Blob ID: ${blob.blobId}`);
      } else if (result.alreadyCertified) {
        setBlobId(result.alreadyCertified.blobId);
        setUploadStatus(
          `Blob already exists! Blob ID: ${result.alreadyCertified.blobId}`
        );
      }

      fetchBalances();
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus(`Upload failed: ${error.message}`);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadStatus(
      `File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
    );
  };

  // Mint NFT
  const handleMint = () => {
    if (!blobId || !account) return setUploadStatus("Upload image first");
    setUploadStatus("Minting NFT...");

    const txb = new Transaction();

    // Create a simple display-based NFT using Sui's built-in functions
    const nftName = txb.pure.string(nftName);
    const nftDesc = txb.pure.string(nftDescription);
    const imageUrl = txb.pure.string(`${AGGREGATOR}/v1/blobs/${blobId}`);

    // Use the kiosk standard or create a simple object
    // This is a workaround since devnet_nft module may not exist
    txb.moveCall({
      target: "0x2::transfer::public_transfer",
      arguments: [
        txb.object("0x2"), // Placeholder - this will fail but demonstrates the issue
        txb.pure.address(account.address),
      ],
      typeArguments: ["0x2::coin::Coin<0x2::sui::SUI>"],
    });

    signAndExecute(
      {
        transaction: txb,
      },
      {
        onSuccess: (result) => {
          const nftObjectId = result.objectChanges?.find(
            (change: any) => change.type === "created"
          )?.objectId;
          setUploadStatus(`Minted! NFT Object ID: ${nftObjectId}`);
        },
        onError: (error) => setUploadStatus(`Mint failed: ${error}`),
      }
    );
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Sui NFT Minter with Walrus
        </h1>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-5">
      <div className="max-w-2xl mx-auto font-sans">
        <h1 className="text-center text-3xl font-bold text-gray-800 mb-4">
          Sui NFT Minter with Walrus Storage
        </h1>
        <p className="text-center text-gray-500 mb-2">
          Connected: {account.address.slice(0, 8)}...
        </p>

        {/* Balance Display */}
        <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-sm text-gray-600">WAL Balance</p>
              <p className="text-2xl font-bold text-blue-600">{walBalance}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">SUI Balance</p>
              <p className="text-2xl font-bold text-green-600">{suiBalance}</p>
            </div>
          </div>
          <button
            onClick={fetchBalances}
            className="mt-2 w-full text-sm text-blue-600 hover:text-blue-800 py-1"
          >
            Refresh Balances
          </button>
        </div>

        {/* Low Balance Warning */}
        {parseFloat(walBalance) < 0.01 && (
          <div className="mb-4 p-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-red-800 font-semibold mb-2">Low WAL Balance</p>
            <p className="text-red-700 text-sm mb-2">
              You need WAL tokens to upload files to Walrus.
            </p>
            <a
              href="https://faucet.walrus.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Get WAL Tokens from Faucet
            </a>
          </div>
        )}

        {/* Upload Section */}
        <section className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h2 className="text-2xl font-semibold text-blue-600 mb-4">
            Upload Image to Walrus
          </h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
          />

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isPending}
            className={`px-6 py-3 rounded-md text-white font-medium ${
              !selectedFile || isPending
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            Upload to Walrus
          </button>

          <p className="mt-4 text-blue-600 font-medium text-sm">
            Status: {uploadStatus}
          </p>

          {blobId && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">Blob ID:</span> {blobId}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">Image URL:</span>
              </p>
              <a
                href={`${AGGREGATOR}/v1/blobs/${blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 break-all"
              >
                {AGGREGATOR}/v1/blobs/{blobId}
              </a>
            </div>
          )}
        </section>

        {/* Mint Section - Disabled until you deploy an NFT contract */}
        {blobId && (
          <section className="p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">
              NFT Ready
            </h2>
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-yellow-800 font-semibold mb-2">Note:</p>
              <p className="text-sm text-yellow-700">
                The devnet_nft module doesn't exist on testnet. You need to
                deploy your own NFT Move module to mint NFTs. Your image is
                successfully uploaded to Walrus at the URL below.
              </p>
            </div>
            <input
              type="text"
              placeholder="NFT Name"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              className="w-full p-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
            <input
              type="text"
              placeholder="Description"
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
            <button
              onClick={handleMint}
              disabled={true}
              className="px-6 py-2 rounded-md text-white font-medium bg-gray-300 cursor-not-allowed"
              title="Deploy your own NFT contract first"
            >
              Mint NFT (Contract Required)
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Deploy an NFT Move module first, then update the target address in
              the code.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export default Mint;
