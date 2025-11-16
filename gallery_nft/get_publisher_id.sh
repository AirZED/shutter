#!/bin/bash

# Script to fetch Publisher Object ID from deployment transaction
# This helps you find the Publisher ID needed for init_display.sh

DEPLOYMENT_TX="4wV6GYjjoYknTJgfz7BYegby5EydTr4QqS7Td7Nu9tbb"

echo "🔍 Fetching Publisher Object ID from deployment transaction..."
echo "Transaction: $DEPLOYMENT_TX"
echo ""

# Fetch transaction details
echo "Fetching transaction details..."

# Try using sui CLI first, then fall back to RPC API
if command -v sui &> /dev/null; then
  echo "Using Sui CLI..."
  TX_OUTPUT=$(sui client tx-block "$DEPLOYMENT_TX" --json 2>&1)
  TX_SUCCESS=$?
else
  echo "Sui CLI not found, using RPC API..."
  RPC_URL="https://fullnode.testnet.sui.io:443"
  
  # Use curl to call Sui RPC API
  TX_OUTPUT=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"sui_getTransactionBlock\",
      \"params\": [
        \"$DEPLOYMENT_TX\",
        {
          \"showInput\": true,
          \"showEffects\": true,
          \"showEvents\": true,
          \"showObjectChanges\": true,
          \"showBalanceChanges\": true
        }
      ]
    }" 2>&1)
  TX_SUCCESS=$?
fi

if [ $TX_SUCCESS -ne 0 ] || [ -z "$TX_OUTPUT" ]; then
  echo "❌ Error: Failed to fetch transaction"
  echo ""
  echo "You can find the Publisher Object ID manually:"
  echo "  1. Visit: https://suiscan.xyz/testnet/tx/$DEPLOYMENT_TX"
  echo "  2. Look in the 'Created Objects' section"
  echo "  3. Find the object with type containing 'Publisher'"
  exit 1
fi

# Extract deployer address (the transaction sender - Publisher is owned by the sender)
DEPLOYER=""
if command -v jq &> /dev/null; then
  DEPLOYER=$(echo "$TX_OUTPUT" | jq -r '.result.transaction.data.sender // empty' 2>/dev/null)
else
  DEPLOYER=$(echo "$TX_OUTPUT" | grep -o '"sender":"0x[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Try to extract Publisher ID from JSON output
# Method 1: Use jq if available (most reliable)
if command -v jq &> /dev/null; then
  # Check objectChanges for Publisher
  PUBLISHER_ID=$(echo "$TX_OUTPUT" | jq -r '.result.objectChanges[]? | select(.type == "created" and (.objectType // "" | contains("Publisher"))) | .objectId' 2>/dev/null | head -1)
fi

# Method 2: Fallback to grep if jq not available or Publisher not found
if [ -z "$PUBLISHER_ID" ] || [ "$PUBLISHER_ID" == "null" ]; then
  # Look for objects with "Publisher" in the type
  PUBLISHER_ID=$(echo "$TX_OUTPUT" | grep -i "Publisher" | grep -o '"objectId":"0x[^"]*"' | head -1 | cut -d'"' -f4)
  
  # Alternative: look in objectChanges array for created objects
  if [ -z "$PUBLISHER_ID" ]; then
    PUBLISHER_ID=$(echo "$TX_OUTPUT" | grep -A 10 -i "objectChanges" | grep -i "publisher" | grep -o '"objectId":"0x[^"]*"' | head -1 | cut -d'"' -f4)
  fi
fi

# Method 3: Query deployer's owned objects (Publisher is usually not in transaction objectChanges)
if [ -z "$PUBLISHER_ID" ] || [ "$PUBLISHER_ID" == "null" ] || [ "$PUBLISHER_ID" == "" ]; then
  if [ -n "$DEPLOYER" ] && [ "$DEPLOYER" != "null" ] && [ "$DEPLOYER" != "" ] && command -v curl &> /dev/null; then
    echo "Publisher not in transaction objectChanges (this is normal)"
    echo "Found deployer (sender): $DEPLOYER"
    echo "Querying deployer's owned objects for Publisher..."
    
    RPC_URL="https://fullnode.testnet.sui.io:443"
    
    # First try with a filter for Publisher type
    OWNED_OBJECTS=$(curl -s -X POST "$RPC_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": 1,
        \"method\": \"suix_getOwnedObjects\",
        \"params\": [
          \"$DEPLOYER\",
          {
            \"filter\": {\"StructType\": \"0x2::package::Publisher\"},
            \"options\": {\"showType\": true, \"showOwner\": true, \"showContent\": true}
          },
          null,
          50
        ]
      }" 2>/dev/null)
    
    # Extract Publisher ID from owned objects
    if [ -n "$OWNED_OBJECTS" ]; then
      if command -v jq &> /dev/null; then
        PUBLISHER_ID=$(echo "$OWNED_OBJECTS" | jq -r '.result.data[]? | select(.data.type // "" | contains("Publisher")) | .data.objectId' 2>/dev/null | head -1)
      else
        PUBLISHER_ID=$(echo "$OWNED_OBJECTS" | grep -i "Publisher" | grep -o '"objectId":"0x[^"]*"' | head -1 | cut -d'"' -f4)
      fi
    fi
    
    # If filter didn't work, try getting all objects and filtering
    if [ -z "$PUBLISHER_ID" ] || [ "$PUBLISHER_ID" == "null" ] || [ "$PUBLISHER_ID" == "" ]; then
      echo "Trying alternative query method (fetching all objects)..."
      OWNED_OBJECTS=$(curl -s -X POST "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d "{
          \"jsonrpc\": \"2.0\",
          \"id\": 2,
          \"method\": \"suix_getOwnedObjects\",
          \"params\": [
            \"$DEPLOYER\",
            {
              \"options\": {\"showType\": true, \"showOwner\": true, \"showContent\": true}
            },
            null,
            100
          ]
        }" 2>/dev/null)
      
      if command -v jq &> /dev/null; then
        PUBLISHER_ID=$(echo "$OWNED_OBJECTS" | jq -r '.result.data[]? | select(.data.type // "" | contains("Publisher")) | .data.objectId' 2>/dev/null | head -1)
      else
        PUBLISHER_ID=$(echo "$OWNED_OBJECTS" | grep -i "Publisher" | grep -o '"objectId":"0x[^"]*"' | head -1 | cut -d'"' -f4)
      fi
    fi
    
    if [ -n "$PUBLISHER_ID" ] && [ "$PUBLISHER_ID" != "null" ] && [ "$PUBLISHER_ID" != "" ]; then
      echo "✅ Found Publisher in deployer's owned objects!"
    else
      echo "⚠️  Publisher not found in owned objects query"
    fi
  fi
fi

if [ -z "$PUBLISHER_ID" ] || [ "$PUBLISHER_ID" == "null" ] || [ "$PUBLISHER_ID" == "" ]; then
  echo "⚠️  Could not automatically extract Publisher ID"
  echo ""
  
  echo "Please find it manually using one of these methods:"
  echo ""
  echo "Method 1: Sui Explorer - Check 'Changes' Tab (Recommended)"
  echo "  1. Visit: https://suiscan.xyz/testnet/tx/$DEPLOYMENT_TX"
  echo "  2. Click on the 'Changes' tab (next to 'Transactions' tab)"
  echo "  3. Look in the 'Created Objects' section"
  echo "  4. Find the object with type containing 'Publisher'"
  echo "     (The Publisher object is owned by the transaction sender)"
  echo ""
  echo "     Note: Publisher may not appear in Created Objects. If not found, use Method 2."
  echo ""
  
  if [ -n "$DEPLOYER" ] && [ "$DEPLOYER" != "null" ] && [ "$DEPLOYER" != "" ]; then
    echo "Method 2: Check Deployer's Objects (Transaction Sender) - MOST RELIABLE"
    echo "  Deployer address (sender): $DEPLOYER"
    echo "  Visit: https://suiscan.xyz/testnet/address/$DEPLOYER"
    echo "  Look for objects with type containing 'Publisher'"
    echo ""
    echo "  Or use Sui CLI:"
    echo "    sui client objects $DEPLOYER | grep Publisher"
    echo ""
  fi
  
  echo "Method 3: Use Web UI"
  echo "  Navigate to /init-display in your app"
  echo "  The UI will help you find and use the Publisher ID"
  echo ""
  
  exit 1
fi

echo "✅ Found Publisher Object ID:"
echo "   $PUBLISHER_ID"
echo ""
echo "Known Publisher ID from latest deployment (4wV6GYjjoYknTJgfz7BYegby5EydTr4QqS7Td7Nu9tbb):"
echo "   0xd1b05a0fc0c1872d7c5a0ace2323de872d1c46afc15133b311287f9e9ea5752f"
echo ""
echo "Note: Display is now automatically initialized via init() function."
echo "You only need this Publisher ID if you want to update Display metadata later."
echo ""
echo "To update Display metadata, run:"
echo "   ./init_display.sh $PUBLISHER_ID"
echo ""
echo "Or copy the ID above and use it in the web UI at /init-display"

