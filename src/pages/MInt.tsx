import React, { useState, useEffect } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  ConnectButton,
} from "@mysten/dapp-kit";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { WalrusClient, WalrusFile } from "@mysten/walrus";
import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url";

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
  const [flow, setFlow] = useState<any>(null);
  const [walMerged, setWalMerged] = useState(false);
  const [storagePrice, setStoragePrice] = useState(0);
  const [walBalance, setWalBalance] = useState<string>("0");
  const [suiBalance, setSuiBalance] = useState<string>("0");

  const suiClient = new SuiClient({
    url: getFullnodeUrl("testnet"),
    network: "testnet",
  });

  const walrusClient = new WalrusClient({
    network: "testnet",
    suiClient,
 
  });

  // WAL token contract address (full Coin type)
  const WAL_COIN_TYPE =
    "0x2::coin::Coin<0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL>";
  const WAL_TYPE =
    "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";

  // Scan all coins to find WAL
  const scanAllCoins = async () => {
    if (!account) return;
    setUploadStatus("Scanning all your coins...");
    try {
      const allObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: { showType: true, showContent: true },
      });

      console.log("Total objects found:", allObjects.data.length);

      const walCoins = allObjects.data.filter((obj: any) =>
        obj.data?.type?.includes("::wal::WAL")
      );

      console.log("WAL-like coins found:", walCoins);

      if (walCoins.length > 0) {
        console.log("Found WAL tokens with types:");
        walCoins.forEach((coin: any) => {
          console.log("  -", coin.data.type);
        });
        setUploadStatus(
          `Found ${walCoins.length} WAL tokens! Check console for types.`
        );
      } else {
        setUploadStatus(
          "No WAL tokens found in your wallet. Check the correct address."
        );
      }
    } catch (error) {
      console.error("Scan failed:", error);
      setUploadStatus(`Scan error: ${error}`);
    }
  };

  // Fetch balances
  const fetchBalances = async () => {
    if (!account) return;
    try {
      console.log("Fetching WAL coins for:", account.address);
      console.log("Using WAL type:", WAL_TYPE);

      // Try getBalance API first
      const walBal = await suiClient.getBalance({
        owner: account.address,
        coinType: WAL_TYPE,
      });

      console.log("WAL Balance from API:", walBal);

      const suiBal = await suiClient.getBalance({
        owner: account.address,
      });

      const walBalanceFormatted = (Number(walBal.totalBalance) / 1e9).toFixed(
        4
      );
      const suiBalanceFormatted = (Number(suiBal.totalBalance) / 1e9).toFixed(
        4
      );

      console.log(`Total WAL: ${walBalanceFormatted} WAL`);
      console.log(`Total SUI: ${suiBalanceFormatted} SUI`);
      console.log(`WAL in raw MIST: ${walBal.totalBalance}`);

      setWalBalance(walBalanceFormatted);
      setSuiBalance(suiBalanceFormatted);
      setUploadStatus(
        `Balance: ${walBalanceFormatted} WAL, ${suiBalanceFormatted} SUI`
      );
    } catch (error) {
      console.error("Balance fetch failed:", error);
      setUploadStatus(`Balance fetch error: ${error}`);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [account]);

  // Estimate WAL cost function
  const estimateCost = async (uploadFlow: any) => {
    try {
      const registerArgs = uploadFlow.register({
        epochs: 1,
        owner: account.address,
        deletable: true,
      });
      const dryRunResult = await suiClient.dryRunTransactionBlock({
        transactionBlock: await registerArgs.build({ client: suiClient }),
      });
      const balanceChanges = dryRunResult.balanceChanges || [];
      const walChanges = balanceChanges.filter(
        (change: any) => change.coinType === WAL_TYPE
      );
      let totalWalCost = 0n;
      for (const change of walChanges) {
        const amount = BigInt(change.amount);
        if (amount < 0n) {
          totalWalCost += amount * -1n;
        }
      }
      const cost = Number(totalWalCost) / 1e9;
      setStoragePrice(cost);
      return cost;
    } catch (error) {
      console.error("Cost estimation failed:", error);
      return 0;
    }
  };

  // Merge WAL coins function
  const handleMergeWal = async () => {
    if (!account) return setUploadStatus("Connect wallet first");
    setUploadStatus("Merging WAL coins...");
    try {
      // Fetch all objects and filter for WAL coins
      const allObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: { showContent: true, showType: true },
      });

      const walCoins = allObjects.data.filter(
        (obj: any) => obj.data?.type === WAL_COIN_TYPE
      );

      const coinIds = walCoins.map((obj: any) => obj.data.objectId);

      if (coinIds.length < 2) {
        setUploadStatus(
          `You have ${coinIds.length} WAL coin(s). Need at least 2 to merge.`
        );
        return;
      }
      const txb = new Transaction();
      const [primaryCoinId, ...mergeCoinIds] = coinIds;
      const primaryCoin = txb.object(primaryCoinId);
      const mergeCoins = mergeCoinIds.map((id: string) => txb.object(id));
      txb.mergeCoins(primaryCoin, mergeCoins);
      txb.transferObjects([primaryCoin], account.address);
      signAndExecute(
        {
          transaction: txb,
        },
        {
          onSuccess: () => {
            setWalMerged(true);
            setUploadStatus("WAL coins merged! Refreshing balance...");
            setTimeout(fetchBalances, 2000);
          },
          onError: (error) => setUploadStatus(`Merge failed: ${error}`),
        }
      );
    } catch (error) {
      setUploadStatus(`Error fetching WAL coins: ${error}`);
    }
  };

  // Handle file selection and initial encode
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return setUploadStatus("Connect wallet first");
    setSelectedFile(file);
    setUploadStatus("Preparing file...");
    try {
      const walrusFile = WalrusFile.from({
        contents: file,
        identifier: file.name,
        tags: { "content-type": file.type },
      });
      const uploadFlow = walrusClient.writeFilesFlow({ files: [walrusFile] });
      await uploadFlow.encode();
      setFlow(uploadFlow);
      const cost = await estimateCost(uploadFlow);
      setUploadStatus(
        `File encoded. Est. WAL cost: ${cost.toFixed(
          6
        )}. Click "Register" to continue.`
      );
    } catch (error) {
      setUploadStatus(`Encode failed: ${error}`);
    }
  };

  // Step 2: Register
  const handleRegister = () => {
    if (!flow || !account) return;

    // Check if we have enough WAL
    const currentWal = parseFloat(walBalance);
    if (storagePrice > 0 && currentWal < storagePrice) {
      setUploadStatus(
        `Insufficient WAL! You have ${walBalance} WAL but need ~${storagePrice.toFixed(
          6
        )} WAL. Get more from https://faucet.walrus.site/`
      );
      return;
    }

    setUploadStatus("Registering...");
    const registerArgs = flow.register({
      epochs: 1,
      owner: account.address,
      deletable: true,
    });

    signAndExecute(
      {
        transaction: registerArgs,
      },
      {
        onSuccess: async (result) => {
          await flow.upload({ digest: result.digest });
          setUploadStatus('Uploaded! Click "Certify" to finalize.');
          fetchBalances();
        },
        onError: (error) => {
          setUploadStatus(`Register failed: ${error}`);
          fetchBalances();
        },
      }
    );
  };

  // Step 3: Certify
  const handleCertify = () => {
    if (!flow || !account) return;
    setUploadStatus("Certifying...");
    const certifyArgs = flow.certify();
    signAndExecute(
      {
        transaction: certifyArgs,
      },
      {
        onSuccess: async () => {
          const files = await flow.listFiles();
          setBlobId(files[0].id);
          setUploadStatus(`Certified! Blob ID: ${files[0].id}. Ready to mint.`);
          setFlow(null);
          fetchBalances();
        },
        onError: (error) => setUploadStatus(`Certify failed: ${error}`),
      }
    );
  };

  // Mint NFT
  const handleMint = () => {
    if (!blobId || !account) return setUploadStatus("Upload image first");
    setUploadStatus("Minting NFT...");
    const txb = new Transaction();
    const [nft] = txb.moveCall({
      target: "0x2::devnet_nft::mint",
      arguments: [
        txb.pure.string(nftName),
        txb.pure.string(nftDescription),
        txb.pure.string(`walrus://blob/${blobId}`),
      ],
    });
    txb.transferObjects([nft], account.address);
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
          <div className="mt-2 flex gap-2">
            <button
              onClick={fetchBalances}
              className="flex-1 text-sm text-blue-600 hover:text-blue-800 py-1"
            >
              Refresh Balances
            </button>
            <button
              onClick={scanAllCoins}
              className="flex-1 text-sm bg-blue-600 text-white hover:bg-blue-700 py-1 px-2 rounded"
            >
              Scan for WAL
            </button>
          </div>
        </div>

        {/* Low Balance Warning */}
        {parseFloat(walBalance) < 0.01 && (
          <div className="mb-4 p-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-red-800 font-semibold mb-2">
              ⚠️ Low WAL Balance!
            </p>
            <p className="text-red-700 text-sm mb-2">
              You need more WAL tokens to upload files to Walrus.
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

        {/* Merge WAL Section */}
        {!walMerged && parseFloat(walBalance) > 0 && (
          <div className="mb-4 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <p className="text-yellow-800 mb-2">
              💡 Tip: Merge WAL coins to avoid balance errors.
            </p>
            <button
              onClick={handleMergeWal}
              disabled={isPending}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isPending
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-yellow-500 hover:bg-yellow-600"
              }`}
            >
              Merge WAL Coins
            </button>
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
          {storagePrice > 0 && (
            <div className="mb-4 p-3 bg-white border border-gray-200 rounded">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Estimated Cost:</span>{" "}
                {storagePrice.toFixed(6)} WAL
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Your Balance:</span>{" "}
                {walBalance} WAL
              </p>
              {parseFloat(walBalance) < storagePrice && (
                <p className="text-sm text-red-600 font-semibold mt-1">
                  ❌ Insufficient balance!
                </p>
              )}
              {parseFloat(walBalance) >= storagePrice && (
                <p className="text-sm text-green-600 font-semibold mt-1">
                  ✅ Sufficient balance
                </p>
              )}
            </div>
          )}
          <div className="space-x-2 mb-4">
            <button
              onClick={handleRegister}
              disabled={!flow || isPending}
              className={`px-4 py-2 rounded-md text-white font-medium text-sm ${
                !flow || isPending
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              Register & Upload
            </button>
            <button
              onClick={handleCertify}
              disabled={!flow || isPending}
              className={`px-4 py-2 rounded-md text-white font-medium text-sm ${
                !flow || isPending
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              Certify
            </button>
          </div>
          <p className="mt-2 text-blue-600 font-medium text-sm">
            Status: {uploadStatus}
          </p>
          {blobId && (
            <p className="mt-2 text-green-600 text-sm break-all font-mono">
              Image URL: walrus://blob/{blobId}
            </p>
          )}
        </section>

        {/* Mint Section */}
        {blobId && (
          <section className="p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">
              Mint NFT
            </h2>
            <input
              type="text"
              placeholder="NFT Name"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              className="w-full max-w-md p-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Description"
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              className="w-full max-w-md p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleMint}
              disabled={isPending}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                isPending
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-purple-500 hover:bg-purple-600"
              }`}
            >
              Mint NFT
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

export default Mint;
