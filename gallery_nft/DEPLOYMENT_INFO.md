# Gallery NFT Contract - Deployment Information

## Testnet Deployment

**Deployed on:** October 8, 2025  
**Network:** Sui Testnet  
**Transaction Digest:** `eE4hcTZZ6n1o1RHNnDsCETR3q5Ar1XVrmoBrQ2bRMxk`

### Contract Information

- **Package ID:** `0xf5eaa3a7133f481c6505bf17a22ba8b3acf5e0c8c531b64c749b8e4fdd2df345`
- **Module Name:** `gallery_nft`
- **UpgradeCap ID:** `0x57de0a1392278056c3439d53d5646106788af6bcbe785740671eb9c05c730beb`

### Deployment Details

- **Deployer Address:** `0x6829750cae6ed782ff951e2214a7c48ddd35b966757c832b2d5336c5f8f5b453`
- **Gas Used:** 15,487,880 MIST (~0.015 SUI)
- **Epoch:** 881

### Explorer Links

- **Transaction:** https://suiscan.xyz/testnet/tx/eE4hcTZZ6n1o1RHNnDsCETR3q5Ar1XVrmoBrQ2bRMxk
- **Package:** https://suiscan.xyz/testnet/object/0xf5eaa3a7133f481c6505bf17a22ba8b3acf5e0c8c531b64c749b8e4fdd2df345

## Contract Functions

### Public Functions

1. **mint** - Mint a new Gallery NFT
   ```move
   public fun mint(
       name: String,
       description: String,
       walrus_blob_id: String,
       image_url: String,
       access_tier: String,
       ctx: &mut TxContext,
   )
   ```

2. **transfer_nft** - Transfer NFT to another address
   ```move
   public fun transfer_nft(nft: GalleryNFT, recipient: address, _ctx: &mut TxContext)
   ```

3. **update_description** - Update NFT description
   ```move
   public fun update_description(
       nft: &mut GalleryNFT,
       new_description: vector<u8>,
       _ctx: &mut TxContext,
   )
   ```

4. **burn** - Delete/burn the NFT
   ```move
   public fun burn(nft: GalleryNFT, _ctx: &mut TxContext)
   ```

### Getter Functions

- `name(nft: &GalleryNFT): String`
- `description(nft: &GalleryNFT): String`
- `walrus_blob_id(nft: &GalleryNFT): String`
- `url(nft: &GalleryNFT): String`
- `creator(nft: &GalleryNFT): address`
- `access_tier(nft: &GalleryNFT): String`
- `created_at(nft: &GalleryNFT): u64`
- `has_access_tier(nft: &GalleryNFT, tier: String): bool`

## Test Results

All 10 tests passed successfully:
- ✅ test_mint_nft
- ✅ test_mint_multiple_nfts
- ✅ test_transfer_nft
- ✅ test_update_description
- ✅ test_burn_nft
- ✅ test_has_access_tier
- ✅ test_different_access_tiers
- ✅ test_view_functions
- ✅ test_mint_with_empty_url_fails
- ✅ test_mint_with_empty_access_tier_fails

## Usage Example

To mint an NFT from the command line:

```bash
sui client call \
  --package 0xf5eaa3a7133f481c6505bf17a22ba8b3acf5e0c8c531b64c749b8e4fdd2df345 \
  --module gallery_nft \
  --function mint \
  --args "My NFT" "Description" "blob_id_123" "https://aggregator.walrus-testnet.walrus.space/v1/blobs/blob_id_123" "public" \
  --gas-budget 10000000
```

## Integration with Frontend

Update your frontend code to use this Package ID:

```typescript
const GALLERY_NFT_PACKAGE_ID = "0xf5eaa3a7133f481c6505bf17a22ba8b3acf5e0c8c531b64c749b8e4fdd2df345";
```

## Display Metadata Initialization

**IMPORTANT:** To make NFTs appear in wallets, you must initialize Display metadata after deployment.

### Step 1: Get the Publisher Object ID

**Note:** The Publisher object is created when you publish a package, but it may not always appear in the transaction's `objectChanges` or `created` objects list. This is normal behavior in Sui.

To find the Publisher Object ID, try these methods:

**Method 1: Check the Deployer's Address Page (Most Reliable)**
1. Go to the deployer's address page: https://suiscan.xyz/testnet/address/0x6829750cae6ed782ff951e2214a7c48ddd35b966757c832b2d5336c5f8f5b453
2. Look for objects with type containing `Publisher`
3. The Publisher object ID will be listed there

**Method 2: Use the Helper Script**
```bash
./get_publisher_id.sh
```
This script will attempt to find the Publisher ID automatically.

**Method 3: Use Sui CLI (if installed)**
```bash
sui client objects 0x6829750cae6ed782ff951e2214a7c48ddd35b966757c832b2d5336c5f8f5b453 | grep Publisher
```

**Method 4: Use the Web UI**
Navigate to `/init-display` in your app - the UI will help you find and use the Publisher ID.

### Step 2: Call init_display

Once you have the Publisher Object ID:

```bash
./init_display.sh <PUBLISHER_OBJECT_ID>
```

Or using sui client directly:
```bash
sui client call \
  --package 0xf5eaa3a7133f481c6505bf17a22ba8b3acf5e0c8c531b64c749b8e4fdd2df345 \
  --module gallery_nft \
  --function init_display \
  --args "<PUBLISHER_OBJECT_ID>" \
  --gas-budget 10000000
```

### What Display Metadata Does

- Makes NFTs visible in wallet NFT lists
- Provides metadata for wallet UI (name, description, image)
- Enables proper NFT display in explorers and marketplaces

**Note:** This only needs to be called ONCE per package. After initialization, all NFTs minted from this contract will automatically use the Display metadata.

## Notes

- The contract supports Walrus-stored images and external URLs
- Access tiers are flexible (e.g., "public", "premium", "exclusive")
- All NFTs track creator address and creation timestamp
- NFTs are transferable and can be burned by the owner
- **Display metadata must be initialized for NFTs to appear in wallets**
