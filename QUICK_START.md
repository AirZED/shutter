# 🚀 Quick Start Guide - Shutter NFT Platform

## ⚡ 60 Second Setup

### 1. Install & Run
```bash
pnpm install
pnpm dev
```

### 2. Get Test Tokens

**Sui (for `/mint`)**:
- WAL: https://faucet.walrus.site/
- SUI: Discord #testnet-faucet

**Solana (for `/mint/solana`)**:
- SOL: https://faucet.solana.com/

### 3. Mint Your First NFT

#### Option A: Sui
```
1. Visit http://localhost:5173/mint
2. Connect Sui Wallet
3. Upload image → Mint
4. Done! 🎉
```

#### Option B: Solana
```
1. Visit http://localhost:5173/mint/solana
2. Connect Phantom
3. Upload image → Mint
4. Done! 🎉
```

## 📋 Key Files

| File | Purpose |
|------|---------|
| `src/pages/MInt.tsx` | Sui minting page |
| `src/pages/MintSolana.tsx` | Solana minting page |
| `gallery_nft/sources/gallery_nft.move` | Sui smart contract |
| `CREATOR_GUIDE.md` | Full documentation |
| `TESTING_CHECKLIST.md` | Testing guide |

## 🔑 Key Concepts

**Walrus** = Decentralized storage (like IPFS but better)  
**Blob ID** = Unique identifier for stored files  
**Access Tier** = Who can view content (public/premium/exclusive)  
**NFT** = "Key" that unlocks gated content

## 🎯 What This Does

1. **Upload** media to Walrus (permanent storage)
2. **Mint** NFT on blockchain (Sui or Solana)
3. **Gate** content behind NFT ownership
4. **Monetize** your content as a creator

## 🆘 Quick Fixes

**"Low WAL Balance"** → Use faucet  
**"Transaction Failed"** → Check gas tokens, retry  
**"Upload Failed"** → Check file size (< 5MB)  
**"Wallet Won't Connect"** → Refresh page  

## 🔗 Important Links

- Sui Explorer: https://testnet.suivision.xyz/
- Solana Explorer: https://explorer.solana.com/?cluster=devnet
- Walrus Docs: https://docs.walrus.site/

## 💰 Monetization Ideas

1. **Exclusive Content**: Photo/video galleries
2. **Membership**: Monthly access NFTs
3. **Limited Editions**: Scarcity = value
4. **Tiered Access**: Bronze/Silver/Gold levels

## 🎨 For Creators

```
Your Content → Walrus Storage → NFT → Collectors Pay → You Earn 💰
```

## 📱 User Flow

```
Creator                          Collector
   │                                │
   ├─ Upload Content                │
   ├─ Mint NFT                      │
   ├─ Set Price                     │
   │                                │
   │                    ┌───────────┤
   │                    │ Browse Content
   │                    │ See Preview
   │                    │ Mint NFT
   │                    └───────────┤
   │                                │
   ├─ Receive Payment ◄─────────────┤
   │                                │
   │                    ┌───────────┤
   │                    │ View Full Content
   │                    │ Access Protected Media
   │                    └───────────┘
```

## ✨ What's New (v1.0)

✅ Fixed Sui minting (was broken!)  
✅ Unified Walrus storage (both chains)  
✅ Image preview feature  
✅ Better error handling  
✅ Improved UI/UX  
✅ Comprehensive docs  

## 🎓 Learn More

- Full Guide: `CREATOR_GUIDE.md`
- Testing: `TESTING_CHECKLIST.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`

## 📞 Need Help?

1. Check console (F12) for errors
2. Read CREATOR_GUIDE.md troubleshooting
3. Verify wallet connection & tokens
4. Open GitHub issue

---

**Ready to mint? Let's go! 🚀**

```bash
pnpm dev
# Then visit http://localhost:5173/mint
```
