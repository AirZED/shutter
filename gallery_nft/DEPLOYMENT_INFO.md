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

## Notes

- The contract supports Walrus-stored images and external URLs
- Access tiers are flexible (e.g., "public", "premium", "exclusive")
- All NFTs track creator address and creation timestamp
- NFTs are transferable and can be burned by the owner
