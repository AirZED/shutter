/// Module: gallery_nft
module gallery_nft::gallery_nft;

use std::string::{Self, String};
use sui::event;

/// NFT that gates access to a Walrus-stored image
public struct GalleryNFT has key, store {
    id: UID,
    /// Name/title of the image
    name: String,
    /// Description of the image
    description: String,
    /// Walrus blob ID for the image
    walrus_blob_id: String,
    /// Creator's address
    creator: address,
    /// Access level (e.g., "public", "premium", "exclusive")
    access_tier: String,
    /// Creation timestamp (epoch)
    created_at: u64,
}

/// Event emitted when a new NFT is minted
public struct NFTMinted has copy, drop {
    nft_id: address,
    creator: address,
    walrus_blob_id: String,
    access_tier: String,
}

/// Error codes
const EInvalidBlobId: u64 = 1;
const EInvalidAccessTier: u64 = 2;

/// Mint a new Gallery NFT
#[allow(lint(self_transfer))]
public fun mint(
    name: vector<u8>,
    description: vector<u8>,
    walrus_blob_id: vector<u8>,
    access_tier: vector<u8>,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let nft_uid = object::new(ctx);
    let nft_id = object::uid_to_address(&nft_uid);

    // Validate inputs
    assert!(!std::vector::is_empty(&walrus_blob_id), EInvalidBlobId);
    assert!(!std::vector::is_empty(&access_tier), EInvalidAccessTier);

    let nft = GalleryNFT {
        id: nft_uid,
        name: string::utf8(name),
        description: string::utf8(description),
        walrus_blob_id: string::utf8(walrus_blob_id),
        creator: sender,
        access_tier: string::utf8(access_tier),
        created_at: tx_context::epoch(ctx),
    };

    event::emit(NFTMinted {
        nft_id,
        creator: sender,
        walrus_blob_id: string::utf8(walrus_blob_id),
        access_tier: string::utf8(access_tier),
    });

    transfer::public_transfer(nft, sender);
}

/// Transfer NFT to another address
public  fun transfer_nft(nft: GalleryNFT, recipient: address, _ctx: &mut TxContext) {
    transfer::public_transfer(nft, recipient);
}

/// Update NFT description (only owner can do this)
public  fun update_description(
    nft: &mut GalleryNFT,
    new_description: vector<u8>,
    _ctx: &mut TxContext,
) {
    nft.description = string::utf8(new_description);
}

/// Burn/delete the NFT (only owner can do this)
public  fun burn(nft: GalleryNFT, _ctx: &mut TxContext) {
    let GalleryNFT {
        id,
        name: _,
        description: _,
        walrus_blob_id: _,
        creator: _,
        access_tier: _,
        created_at: _,
    } = nft;
    object::delete(id);
}

// === View Functions ===

/// Get NFT name
public fun name(nft: &GalleryNFT): String {
    nft.name
}

/// Get NFT description
public fun description(nft: &GalleryNFT): String {
    nft.description
}

/// Get Walrus blob ID
public fun walrus_blob_id(nft: &GalleryNFT): String {
    nft.walrus_blob_id
}

/// Get creator address
public fun creator(nft: &GalleryNFT): address {
    nft.creator
}

/// Get access tier
public fun access_tier(nft: &GalleryNFT): String {
    nft.access_tier
}

/// Get creation timestamp
public fun created_at(nft: &GalleryNFT): u64 {
    nft.created_at
}

/// Check if an address owns an NFT with a specific access tier
/// (This would be called off-chain to gate access)
public fun has_access_tier(nft: &GalleryNFT, required_tier: String): bool {
    nft.access_tier == required_tier
}
