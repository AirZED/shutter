#!/bin/bash

# Script to initialize Display metadata for GalleryNFT
# NOTE: Display is now automatically initialized via init() function during deployment.
# This script is kept for updating Display metadata after initial deployment.
#
# Usage:
#   ./init_display.sh <PUBLISHER_OBJECT_ID>
#   or
#   PUBLISHER_ID=<PUBLISHER_OBJECT_ID> ./init_display.sh

PACKAGE_ID="0x1d1af7043571e2892f95e3314e5fd8e6c848d90f49367665feae511737348edc"

# Get publisher ID from command line argument or environment variable
PUBLISHER_ID="${1:-${PUBLISHER_ID}}"

if [ -z "$PUBLISHER_ID" ]; then
  echo "❌ Error: Publisher Object ID is required"
  echo ""
  echo "Usage:"
  echo "  ./init_display.sh <PUBLISHER_OBJECT_ID>"
  echo "  or"
  echo "  PUBLISHER_ID=<PUBLISHER_OBJECT_ID> ./init_display.sh"
  echo ""
  echo "To find your Publisher Object ID:"
  echo "  Option 1: Run the helper script (recommended):"
  echo "    ./get_publisher_id.sh"
  echo ""
  echo "  Option 2: Manual lookup:"
  echo "    1. Check deployer's address page: https://suiscan.xyz/testnet/address/0x9db84ca4d1eb64eff6088d1538a084723432a85bccedfb61ef2447e1a1f7465d"
  echo "    2. Look for objects with type containing 'Publisher'"
  echo "    3. Or visit transaction: https://suiscan.xyz/testnet/tx/4wV6GYjjoYknTJgfz7BYegby5EydTr4QqS7Td7Nu9tbb"
  echo ""
  echo "  Publisher ID from latest deployment:"
  echo "    0xd1b05a0fc0c1872d7c5a0ace2323de872d1c46afc15133b311287f9e9ea5752f"
  echo ""
  echo "Example:"
  echo "  ./init_display.sh 0x1234567890abcdef..."
  exit 1
fi

echo "🎨 Initializing Display metadata for GalleryNFT..."
echo "Package ID: $PACKAGE_ID"
echo "Publisher ID: $PUBLISHER_ID"
echo ""

# Validate publisher ID format (basic check - should start with 0x)
if [[ ! "$PUBLISHER_ID" =~ ^0x[a-fA-F0-9]+$ ]]; then
  echo "❌ Error: Invalid Publisher Object ID format"
  echo "   Publisher ID should start with '0x' and contain only hex characters"
  exit 1
fi

echo "Calling init_display function..."
echo ""

sui client call \
  --package "$PACKAGE_ID" \
  --module gallery_nft \
  --function init_display \
  --args "$PUBLISHER_ID" \
  --gas-budget 10000000

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Display metadata initialized successfully!"
  echo "   NFTs from this contract will now appear in wallets."
else
  echo ""
  echo "❌ Failed to initialize Display metadata"
  echo "   Please check:"
  echo "   - You are using the correct Publisher Object ID"
  echo "   - You are connected to the correct network (testnet)"
  echo "   - Your wallet has sufficient SUI for gas"
  exit 1
fi

