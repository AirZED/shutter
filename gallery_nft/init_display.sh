#!/bin/bash

# Script to initialize Display metadata for GalleryNFT
# This must be run by the package publisher after deployment
#
# Usage:
#   ./init_display.sh <PUBLISHER_OBJECT_ID>
#   or
#   PUBLISHER_ID=<PUBLISHER_OBJECT_ID> ./init_display.sh

PACKAGE_ID="0xf5eaa3a7133f481c6505bf17a22ba8b3acf5e0c8c531b64c749b8e4fdd2df345"

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
  echo "    1. Visit: https://suiscan.xyz/testnet/tx/eE4hcTZZ6n1o1RHNnDsCETR3q5Ar1XVrmoBrQ2bRMxk"
  echo "    2. Look in the 'Created Objects' section"
  echo "    3. Find the object with type containing 'Publisher'"
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

