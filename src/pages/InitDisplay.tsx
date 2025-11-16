import React, { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  ConnectButton,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { GALLERY_NFT_PACKAGEID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function InitDisplay() {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction, isPending } = useSignAndExecuteTransaction();
  const { toast } = useToast();
  const [publisherId, setPublisherId] = useState("");
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);

  const suiClient = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });

  const handleInitDisplay = async () => {
    if (!publisherId.trim()) {
      toast({
        title: "Publisher ID Required",
        description: "Please enter the Publisher object ID from your deployment",
        variant: "destructive",
      });
      return;
    }

    if (!account) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setStatus("Initializing Display metadata...");
    setSuccess(false);

    try {
      const txb = new Transaction();

      // Get the Publisher object
      const publisherObj = txb.object(publisherId);

      // Call init_display
      txb.moveCall({
        target: `${GALLERY_NFT_PACKAGEID}::gallery_nft::init_display`,
        arguments: [publisherObj],
      });

      signAndExecuteTransaction(
        {
          transaction: txb,
        },
        {
          onSuccess: (result) => {
            setStatus(`✅ Display metadata initialized successfully!`);
            setSuccess(true);
            toast({
              title: "Display Metadata Initialized",
              description: `NFTs from this contract will now appear in wallets!`,
              action: (
                <a
                  href={`https://testnet.suivision.xyz/txblock/${result.digest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  View Transaction
                </a>
              ),
            });
          },
          onError: (error) => {
            console.error("Init display error:", error);
            setStatus(`❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setSuccess(false);
            toast({
              title: "Initialization Failed",
              description: `Failed to initialize Display metadata: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              variant: "destructive",
            });
          },
        }
      );
    } catch (error) {
      console.error("Error:", error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setSuccess(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Initialize Display Metadata
        </h1>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-5">
      <div className="max-w-2xl mx-auto font-sans">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🎨 Initialize Display Metadata
          </h1>
          <p className="text-gray-600">
            Initialize Display metadata so NFTs appear in wallets
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="publisherId" className="text-base font-semibold mb-2 block">
                Publisher Object ID *
              </Label>
              <Input
                id="publisherId"
                placeholder="0x..."
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="h-12 text-base font-mono"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Find this in your deployment transaction under "created" objects. Look for an object with type containing "Publisher".
              </p>
            </div>

            {status && (
              <div
                className={`p-4 rounded-xl border ${
                  success
                    ? "bg-green-50 border-green-200 text-green-800"
                    : status.includes("❌")
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {success ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : status.includes("❌") ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                  <p className="font-medium">{status}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleInitDisplay}
              disabled={isPending || !publisherId.trim() || success}
              variant="gradient"
              className="w-full h-12 text-base font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Display Metadata Initialized
                </>
              ) : (
                "Initialize Display Metadata"
              )}
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This only needs to be done ONCE per package. After initialization, all NFTs minted from this contract will automatically use the Display metadata and appear in wallets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InitDisplay;


