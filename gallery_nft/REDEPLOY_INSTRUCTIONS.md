# Redeploy Instructions - Publisher Object Fix

## Important: Why Redeploy Instead of Upgrade?

The `init` function **only runs during the initial package publication**, not during upgrades. Since your original package was published without an `init` function, upgrading it won't create the Publisher object.

**Solution:** Publish a fresh package (not upgrade) so the `init` function runs and creates the Publisher + Display objects.

## Steps to Redeploy

### 1. Build the Package

```bash
cd gallery_nft
sui move build
```

### 2. Publish the New Package

```bash
sui client publish --gas-budget 100000000
```

This will:
- ✅ Run the `init` function automatically
- ✅ Create the Publisher object
- ✅ Initialize Display metadata
- ✅ Transfer both objects to your address

### 3. Save the New Package ID

After publishing, you'll see output like:
```
Published Objects:
  ┌──
  │ PackageID: 0x... (NEW PACKAGE ID)
  │ Version: 1
  │ ...
  └──
```

**Save this new Package ID!**

### 4. Verify Publisher and Display Were Created

```bash
# Check your owned objects
sui client objects <YOUR_ADDRESS> | grep -E "Publisher|Display"

# Or check the transaction output
sui client transaction <TRANSACTION_DIGEST>
```

You should see:
- A Publisher object owned by your address
- A Display object owned by your address

### 5. Update Frontend with New Package ID

Update `src/lib/constants.ts`:

```typescript
export const GALLERY_NFT_PACKAGEID = "0x...NEW_PACKAGE_ID_HERE..."
```

### 6. Update Scripts and Documentation

Update these files with the new Package ID and transaction digest:
- `gallery_nft/get_publisher_id.sh` - Update `DEPLOYMENT_TX` and package ID references
- `gallery_nft/init_display.sh` - Update `PACKAGE_ID` (though you won't need this anymore!)
- `gallery_nft/DEPLOYMENT_INFO.md` - Update deployment details

## What Happens After Redeploy

✅ **Publisher object created** - Owned by you, can be used for future upgrades  
✅ **Display metadata initialized** - NFTs will now appear in wallets!  
✅ **No manual `init_display` call needed** - Everything happens automatically  
✅ **Future NFTs will use Display metadata** - All new mints will show in wallets

## Important Notes

- **Old Package ID:** `0xfe91d5daa0f876c14c5ed199a3a2dab562d85bb6e284eceebcb9795e472f0b54` (will be deprecated)
- **New Package ID:** Will be generated during fresh publish
- **Old NFTs:** NFTs minted from the old package won't have Display metadata (they're on the old contract)
- **New NFTs:** NFTs minted from the new package will have Display metadata and appear in wallets

## Alternative: Keep Using Old Package

If you want to keep the old Package ID, you can:
1. Keep the upgraded package (version 2)
2. Manually find/create a Publisher object (if possible)
3. Call `init_display` manually

However, this is more complex and the Publisher may not exist. **Redeploying is the recommended approach.**

