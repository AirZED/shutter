# Testing Checklist for NFT Minting

## 🧪 Pre-Testing Setup

### Sui Testing Setup
- [ ] Have a Sui wallet installed (Sui Wallet, Suiet, or Ethos)
- [ ] Connected to Sui Testnet
- [ ] Have SUI tokens for gas fees ([Sui Faucet](https://discord.com/channels/916379725201563759/971488439931392130))
- [ ] Have WAL tokens for Walrus storage ([Walrus Faucet](https://faucet.walrus.site/))

### Solana Testing Setup
- [ ] Have a Solana wallet installed (Phantom recommended)
- [ ] Connected to Solana Devnet
- [ ] Have SOL tokens for gas fees ([Solana Faucet](https://faucet.solana.com/))
- [ ] Test images ready (JPEG, PNG under 5MB)

## ✅ Sui Minting Tests (`/mint`)

### Basic Functionality
- [ ] Page loads without errors
- [ ] Wallet connection button visible
- [ ] Can connect Sui wallet successfully
- [ ] Balance display shows correct WAL and SUI amounts
- [ ] "Refresh Balances" button works

### File Upload
- [ ] Can select image file
- [ ] File size displays correctly
- [ ] Preview shows before upload
- [ ] "Upload to Walrus" button becomes active
- [ ] Upload progress shows status updates

### Walrus Upload
- [ ] Upload completes successfully
- [ ] Blob ID is displayed
- [ ] Walrus URL is clickable
- [ ] Can view image at Walrus URL
- [ ] Uploaded image displays in preview

### NFT Minting
- [ ] NFT form appears after successful upload
- [ ] Can edit NFT name
- [ ] Can edit description (textarea)
- [ ] Can select access tier (dropdown)
- [ ] "Mint NFT" button is active
- [ ] Wallet prompts for transaction approval
- [ ] Transaction completes successfully
- [ ] Success message shows NFT Object ID
- [ ] Balances refresh after minting

### Edge Cases
- [ ] Cannot mint without uploading first
- [ ] Cannot upload without selecting file
- [ ] Low WAL balance warning appears when < 0.01 WAL
- [ ] Faucet link works in low balance warning
- [ ] Error messages display clearly

### Verification
- [ ] Copy NFT Object ID
- [ ] Visit `https://testnet.suivision.xyz/object/[NFT_ID]`
- [ ] Verify NFT metadata (name, description)
- [ ] Verify image URL points to Walrus
- [ ] Verify access_tier is set correctly
- [ ] Check creator address matches your wallet

## ✅ Solana Minting Tests (`/mint/solana`)

### Basic Functionality
- [ ] Page loads without errors
- [ ] Wallet connection button visible
- [ ] Can connect Solana wallet successfully
- [ ] Wallet address displays correctly (truncated)

### File Upload
- [ ] Can select image file
- [ ] File name and size display correctly
- [ ] Preview shows before upload
- [ ] Preview updates when changing file

### Pre-Upload (Optional Step)
- [ ] "Upload to Walrus" button appears
- [ ] Can pre-upload to Walrus
- [ ] Blob ID displays after upload
- [ ] "View on Walrus" link works
- [ ] Can view image at Walrus URL

### NFT Details
- [ ] Can edit NFT name
- [ ] Can edit description (textarea)
- [ ] Input validation works (required fields)

### NFT Minting
- [ ] "Mint NFT" button shows correct state
- [ ] Status updates show each step:
  - [ ] "Uploading image to Walrus" (if not pre-uploaded)
  - [ ] "Creating metadata"
  - [ ] "Uploading metadata to Walrus"
  - [ ] "Minting NFT on Solana"
- [ ] Wallet prompts for transaction approval
- [ ] Transaction completes successfully
- [ ] Success message shows:
  - [ ] Transaction explorer link
  - [ ] NFT address (mint address)

### Edge Cases
- [ ] Cannot mint without wallet connection
- [ ] Cannot mint without selecting file
- [ ] Minting disabled while in progress
- [ ] Error messages display clearly
- [ ] Can retry after error

### Verification
- [ ] Copy transaction signature
- [ ] Visit Solana Explorer link
- [ ] Verify transaction succeeded
- [ ] Copy NFT address (mint)
- [ ] Check NFT in wallet (may take a few minutes)
- [ ] Verify metadata loads in wallet
- [ ] Verify image loads from Walrus URL

## 🔗 Integration Tests

### Cross-Chain Consistency
- [ ] Same image uploaded to both chains
- [ ] Both NFTs reference same Walrus blob
- [ ] Metadata format is consistent
- [ ] Both NFTs visible in respective wallets
- [ ] Both images load from Walrus URLs

### Walrus Persistence
- [ ] Images remain accessible after 1 hour
- [ ] URLs don't change or expire
- [ ] Can access from different devices/browsers
- [ ] CORS headers allow browser access

## 📊 Performance Tests

### Upload Performance
- [ ] Small image (< 1MB) uploads in < 10 seconds
- [ ] Medium image (1-3MB) uploads in < 30 seconds
- [ ] Large image (3-5MB) uploads in < 60 seconds
- [ ] Progress indicators work smoothly

### Minting Performance
- [ ] Sui minting completes in < 15 seconds
- [ ] Solana minting completes in < 30 seconds
- [ ] UI remains responsive during operations
- [ ] No browser freezing or crashes

## 🐛 Known Issues & Workarounds

### Sui Issues
**Issue**: Low WAL balance
- **Workaround**: Visit Walrus faucet to get tokens
- **Status**: Not a bug, expected behavior

**Issue**: Transaction fails silently
- **Workaround**: Check browser console, refresh page, try again
- **Status**: Under investigation

### Solana Issues
**Issue**: Wallet doesn't appear in app
- **Workaround**: Refresh page, reconnect wallet
- **Status**: Wallet adapter initialization timing

**Issue**: NFT doesn't show in wallet immediately
- **Workaround**: Wait 30-60 seconds, refresh wallet
- **Status**: Expected behavior (blockchain confirmation time)

## 🎯 Success Criteria

### Minimum Viable Product (MVP)
- [x] Sui minting works end-to-end
- [x] Solana minting works end-to-end
- [x] Both use Walrus storage
- [x] Preview functionality works
- [x] Error handling implemented
- [x] User feedback is clear

### Enhanced Features
- [x] Image preview before upload
- [x] Optional pre-upload step
- [x] Access tier selection (Sui)
- [x] Balance display (Sui)
- [x] Status updates during minting
- [x] Explorer links for verification

### Future Enhancements
- [ ] Video support
- [ ] Batch minting
- [ ] Gallery view of minted NFTs
- [ ] Creator dashboard
- [ ] Analytics

## 📝 Test Report Template

```markdown
## Test Session: [Date]

**Tester**: [Your Name]
**Environment**: 
- Browser: [Chrome/Firefox/Safari + Version]
- OS: [macOS/Windows/Linux]
- Wallet: [Sui Wallet/Phantom]

### Sui Tests
- Total Tests: X
- Passed: Y
- Failed: Z
- Issues Found: [List issues]

### Solana Tests
- Total Tests: X
- Passed: Y
- Failed: Z
- Issues Found: [List issues]

### Critical Issues
1. [Issue description]
2. [Issue description]

### Screenshots
- [Attach screenshots of issues]

### Notes
- [Any additional observations]
```

## 🚀 Deployment Checklist

Before deploying to production:

### Code Quality
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All console.logs removed or controlled
- [ ] Error handling comprehensive

### Configuration
- [ ] Update contract addresses for mainnet (Sui)
- [ ] Update RPC endpoints for mainnet
- [ ] Update Walrus endpoints (if mainnet available)
- [ ] Environment variables properly set

### Documentation
- [ ] README updated
- [ ] CREATOR_GUIDE complete
- [ ] API documentation (if applicable)
- [ ] Deployment guide

### Testing
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Cross-browser tested

### Security
- [ ] No private keys in code
- [ ] Wallet connections secure
- [ ] Input validation on all forms
- [ ] Error messages don't leak sensitive info

---

**Last Updated**: [Date]
**Status**: Ready for Testing ✅
