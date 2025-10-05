# Shutter - Multi-Chain NFT Multimedia dApp

A decentralized multimedia platform that mints media into NFT collections with access control based on NFT ownership and traits. Built with Walrus for decentralized storage and supporting both Solana and Sui blockchains.

## 🌟 Features

### Multi-Chain Support
- **Solana Integration**: Connect with Phantom, Solflare, and other Solana wallets
- **Sui Integration**: Connect with Sui Wallet and other Sui-compatible wallets
- **Cross-Chain NFT Verification**: Verify NFT ownership across different blockchains

### NFT-Based Access Control
- **Public Galleries**: Open access to all users
- **NFT Required**: Access restricted to holders of specific NFT collections
- **Trait-Based Access**: Fine-grained control based on NFT metadata traits
- **Real-time Verification**: Automatic verification of NFT ownership and traits

### Media Protection
- **Download Prevention**: Protected media cannot be downloaded or saved
- **View Limits**: Configurable view limits per session
- **Right-Click Protection**: Disabled context menu and drag-and-drop
- **Keyboard Shortcut Blocking**: Prevents common save shortcuts

### Walrus Integration
- **Decentralized Storage**: All media files stored on Walrus
- **Metadata Storage**: NFT metadata and access control rules stored on-chain
- **IPFS Integration**: Seamless integration with IPFS for content addressing

### NFT Minting
- **Collection Creation**: Create NFT collections with custom metadata
- **Batch Minting**: Mint multiple media files as NFTs in a single transaction
- **Access Control Configuration**: Set up access rules during collection creation
- **Metadata Management**: Rich metadata support with custom attributes

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A Solana wallet (Phantom, Solflare, etc.)
- A Sui wallet (Sui Wallet, etc.)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd shutter
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
bun dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🏗️ Architecture

### Core Components

#### Wallet Integration (`src/lib/wallet.ts`)
- Multi-chain wallet connection
- NFT ownership verification
- Trait-based access control
- Cross-chain compatibility

#### NFT Minting (`src/lib/nft-minting.ts`)
- Media upload to Walrus
- NFT collection creation
- Batch NFT minting
- Metadata management

#### Access Control (`src/components/NFTAccessControl.tsx`)
- Real-time NFT verification
- Access status display
- Trait requirement checking
- User-friendly error messages

#### Media Protection (`src/components/ProtectedMedia.tsx`)
- Download prevention
- View limit enforcement
- Context menu blocking
- Keyboard shortcut protection

### Key Features Implementation

#### 1. Multi-Chain Wallet Support
```typescript
// Connect to Solana
const connectSolanaWallet = async () => {
  const response = await window.solana.connect();
  // Handle connection
};

// Connect to Sui
const connectSuiWallet = async () => {
  const accounts = await window.suiWallet.getAccounts();
  // Handle connection
};
```

#### 2. NFT Verification
```typescript
// Verify Solana NFT
const verifySolanaNFT = async (walletAddress, collectionAddress, requiredTraits) => {
  // Check token accounts
  // Verify collection membership
  // Validate traits
};

// Verify Sui NFT
const verifySuiNFT = async (walletAddress, collectionId, requiredTraits) => {
  // Get owned objects
  // Check collection membership
  // Validate traits
};
```

#### 3. Media Protection
```typescript
// Disable right-click
const handleContextMenu = (e) => {
  e.preventDefault();
  toast({ title: "Protected Content", description: "Right-click disabled" });
};

// Disable keyboard shortcuts
const handleKeyDown = (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    toast({ title: "Protected Content", description: "Saving disabled" });
  }
};
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# Solana Configuration
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_NETWORK=devnet

# Sui Configuration
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
VITE_SUI_NETWORK=testnet

# Walrus Configuration
VITE_WALRUS_NETWORK=testnet
```

### Wallet Configuration
The app automatically detects and supports:
- **Solana**: Phantom, Solflare, Backpack, Glow
- **Sui**: Sui Wallet, Suiet, Sui Wallet Extension

## 📱 Usage

### Creating a Gallery
1. Connect your wallet (Solana or Sui)
2. Click "Upload" to open the upload modal
3. Select your media files
4. Choose "Mint as NFT Collection"
5. Configure access control:
   - **Public**: Open to everyone
   - **NFT Required**: Requires specific NFT collection
   - **Trait Required**: Requires specific NFT traits
6. Set collection name, symbol, and blockchain
7. Upload and mint your NFTs

### Accessing Protected Galleries
1. Connect your wallet
2. Browse galleries - locked galleries will show access requirements
3. The app automatically verifies your NFT ownership
4. If you have the required NFT/traits, you'll gain access
5. View protected media with download protection enabled

### Media Protection Features
- **View Limits**: Each protected media has a view limit per session
- **Download Prevention**: Right-click, drag-and-drop, and keyboard shortcuts are disabled
- **Watermarking**: Visual indicators show protected content
- **Access Logging**: Track who accesses your protected content

## 🔒 Security Features

### Access Control
- **NFT Verification**: Real-time verification of NFT ownership
- **Trait Validation**: Precise control based on NFT metadata
- **Session Management**: Secure session handling with view limits
- **Wallet Integration**: Secure wallet connection and transaction signing

### Media Protection
- **Download Prevention**: Multiple layers of download protection
- **View Control**: Configurable view limits and session management
- **Content Security**: Protected media cannot be easily extracted
- **Access Logging**: Track and monitor content access

## 🌐 Supported Blockchains

### Solana
- **Networks**: Mainnet, Devnet, Testnet
- **Wallets**: Phantom, Solflare, Backpack, Glow
- **NFT Standards**: Metaplex Token Metadata
- **Features**: Collection verification, trait-based access

### Sui
- **Networks**: Mainnet, Testnet, Devnet
- **Wallets**: Sui Wallet, Suiet, Sui Wallet Extension
- **NFT Standards**: Sui NFT objects
- **Features**: Object verification, attribute-based access

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
│   ├── ui/             # UI components
│   ├── WalletConnect.tsx
│   ├── NFTAccessControl.tsx
│   ├── ProtectedMedia.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   └── useWallet.ts
├── lib/                # Core functionality
│   ├── wallet.ts       # Wallet integration
│   ├── nft-minting.ts  # NFT minting logic
│   └── walrus.ts       # Walrus integration
└── pages/              # Page components
```

### Key Technologies
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Vite**: Fast build tool and dev server
- **Walrus**: Decentralized storage
- **Solana Web3.js**: Solana blockchain integration
- **Sui SDK**: Sui blockchain integration

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

## 🔮 Roadmap

### Upcoming Features
- **More Blockchains**: Ethereum, Polygon, Avalanche support
- **Advanced Analytics**: Detailed access and usage analytics
- **Content Monetization**: Revenue sharing and subscription models
- **Mobile App**: Native mobile applications
- **API Integration**: RESTful API for third-party integrations
- **Advanced Security**: Additional protection layers and encryption

---

Built with ❤️ using Walrus, Solana, and Sui