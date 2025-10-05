import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

// Create Sui client
const suiClient = new SuiClient({
    url: getFullnodeUrl('testnet'),
});

// Create Walrus client with proper configuration
export const walrusClient = new WalrusClient({
    network: 'testnet',
    suiClient,
    storageNodeClientOptions: {
        timeout: 60_000,
        onError: (error) => console.log('Walrus storage error:', error),
    },
});

// Export Sui client for use in other parts of the app
export { suiClient };