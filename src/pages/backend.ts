// BACKEND
const express = require('express');
const multer = require('multer');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { getFullnodeUrl, SuiClient } = require('@mysten/sui/client');
const { TransactionBlock } = require('@mysten/sui/transactions');
const { WalrusClient, WalrusFile } = require('@mysten/walrus');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Backend Sui keypair (load from env/file in prod)
const keypair = Ed25519Keypair.deriveKeypair('YOUR_PRIVATE_KEY_SEED_PHRASE_OR_HEX'); // Secure this!
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const WAL_COIN_TYPE = '0x2::coin::Coin<0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL>';
const walrusClient = new WalrusClient({ network: 'testnet', suiClient: client });

app.post('/transfer-wal', async (req, res) => {
    const { amountMIST, backendAddress } = req.body; // User sends to backendAddress
    try {
        const txb = new TransactionBlock();
        const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(amountMIST)]);
        txb.transferObjects([coin], txb.pure.address(backendAddress));
        const result = await client.signAndExecuteTransactionBlock({
            transactionBlock: txb,
            signer: keypair, // User's signer? No—frontend signs this!
        });
        res.json({ success: true, digest: result.digest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/upload-to-walrus', upload.single('file'), async (req, res) => {
    const { userAddress } = req.body; // From frontend
    const filePath = req.file.path;
    try {
        const file = fs.readFileSync(filePath);
        const walrusFile = WalrusFile.from({
            contents: file,
            identifier: path.basename(filePath),
            tags: { 'content-type': 'image/jpeg' }, // Adjust as needed
        });
        const flow = walrusClient.writeFilesFlow({ files: [walrusFile] });
        await flow.encode();

        // Register with user as owner (backend signs/pays)
        const registerTx = flow.register({
            epochs: 1,
            owner: userAddress, // Key: Blob owned by user!
            deletable: true,
        });
        const registerResult = await client.signAndExecuteTransactionBlock({
            transactionBlock: registerTx,
            signer: keypair,
        });
        await flow.upload({ digest: registerResult.digest });

        // Certify
        const certifyTx = flow.certify();
        const certifyResult = await client.signAndExecuteTransactionBlock({
            transactionBlock: certifyTx,
            signer: keypair,
        });

        const files = await flow.listFiles();
        const blobId = files[0].id;

        res.json({
            blobId,
            suiObjectId: files[0].objectId, // User's owned object
            success: true,
            cost: '0.011 WAL approx' // From CLI est.
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(filePath); // Cleanup
    }
});

app.listen(3001, () => console.log('Proxy server on http://localhost:3001'));


// FRONTEND
// Est. cost from your estimateCost (e.g., 0.011 WAL = 11000000 MIST)
// const estCostMIST = Math.ceil(storagePrice * 1e9);
// const backendAddress = '0xBACKEND_SUI_ADDRESS'; // Hardcode your backend wallet

// // Transfer WAL (user signs)
// const transferTx = new TransactionBlock();
// const [coin] = transferTx.splitCoins(transferTx.gas, [transferTx.pure.u64(estCostMIST)]);
// transferTx.transferObjects([coin], transferTx.pure.address(backendAddress));
// signAndExecute(
//     { transaction: transferTx },
//     {
//         onSuccess: async () => {
//             setUploadStatus('WAL transferred. Uploading...');
//             // Now POST to proxy
//             const formData = new FormData();
//             formData.append('file', selectedFile!);
//             formData.append('userAddress', account.address);
//             const response = await fetch('http://localhost:3001/upload-to-walrus', {
//                 method: 'POST',
//                 body: formData,
//             });
//             const result = await response.json();
//             if (result.success) {
//                 setBlobId(result.blobId);
//                 setUploadStatus(`Uploaded! Blob owned by you: ${result.blobId}. Ready to mint.`);
//             } else {
//                 setUploadStatus(`Upload failed: ${result.error}`);
//             }
//         },
//         onError: (error) => setUploadStatus(`Transfer failed: ${error}`),
//     }
// );