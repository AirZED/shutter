import { useEffect, useState } from "react";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext"; // Adjust path as needed
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

interface SolanaWalletConnectProps {
    onConnectionChange?: (isConnected: boolean, address?: string) => void;
}

export const SolanaWalletConnect = ({ onConnectionChange }: SolanaWalletConnectProps) => {
    const { connection, connectSolanaWallet, disconnectWallet, isConnecting } = useWallet();
    const { connection: solConnection } = useConnection();

    const [dropdownOpen, setDropdownOpen] = useState(false);

    const isConnected = connection?.chain === 'solana';

    // Fetch balance
    const { data: balance, isLoading: isBalanceLoading } = useQuery({
        queryKey: ["sol-balance", connection?.address],
        queryFn: async () => {
            if (!connection?.address) return null;
            try {
                const balance = await solConnection.getBalance(new PublicKey(connection.address));
                return balance;
            } catch (error) {
                console.error("Error fetching balance:", error);
                return null;
            }
        },
        enabled: isConnected,
        refetchInterval: 10000,
    });

    // Notify parent
    useEffect(() => {
        if (onConnectionChange) {
            onConnectionChange(isConnected, connection?.address);
        }
    }, [isConnected, connection?.address, onConnectionChange]);

    // Format address
    const formatAddress = (addr: string | undefined) =>
        addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

    // Format balance
    const formatBalance = () => {
        if (isBalanceLoading) return "Loading...";
        if (!balance) return "0 SOL";
        const solAmount = balance / LAMPORTS_PER_SOL;
        return `${solAmount.toFixed(2)} SOL`;
    };

    // Handle disconnect
    const handleDisconnect = () => {
        disconnectWallet();
        setDropdownOpen(false);
    };

    return (
        <div className="relative">
            {isConnected ? (
                <div className="relative">
                    <Button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        disabled={isConnecting}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <div className="flex items-center gap-2 justify-center">
                            <span className="text-[.8rem] border-r border-gray-200 pr-2">
                                {formatBalance()}
                            </span>
                            <span className="text-[.8rem]">
                                {formatAddress(connection?.address)}
                            </span>
                        </div>
                        <MdOutlineKeyboardArrowDown
                            className="w-4 h-4 transition-transform duration-200"
                            style={{
                                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                        />
                    </Button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 shadow-2xl rounded-xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                            <div className="p-3">
                                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 mb-2">
                                    Connected Solana Wallet
                                </div>

                                {/* Wallet Info */}
                                <div className="px-3 py-2 mb-3">
                                    <div className="text-sm font-mono text-gray-900 mb-1">
                                        {formatAddress(connection?.address)}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Balance:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {isBalanceLoading ? (
                                                <div className="flex items-center gap-1">
                                                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                    Loading...
                                                </div>
                                            ) : (
                                                formatBalance()
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleDisconnect}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-medium py-2.5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                        />
                                    </svg>
                                    Disconnect Wallet
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <Button
                    onClick={connectSolanaWallet}
                    disabled={isConnecting}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-md transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm">
                        {isConnecting ? "Connecting..." : "Connect Solana Wallet"}
                    </span>
                </Button>
            )}
        </div>
    );
};