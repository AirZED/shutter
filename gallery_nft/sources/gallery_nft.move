/// Module: gallery_nft
module gallery_nft::gallery_nft;

use std::string::{Self, String};
use sui::display;
use sui::event;
use sui::package;

/// NFT that gates access to a Walrus-stored image
public struct GalleryNFT has key, store {
    id: UID,
    /// Name/title of the image
    name: String,
    /// Description of the image
    description: String,
    /// Walrus blob ID for the image
    walrus_blob_id: String,
    /// Standard URL for explorer image display
    url: String,
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
    name: String,
    description: String,
    walrus_blob_id: String,
    access_tier: String,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let nft_uid = object::new(ctx);
    let nft_id = object::uid_to_address(&nft_uid);

    // Validate inputs
    assert!(walrus_blob_id.is_empty(), EInvalidBlobId);
    assert!(!access_tier.is_empty(), EInvalidAccessTier);

    // Build standard URL for image display
    let mut url_str = b"https://aggregator.walrus-testnet.walrus.space/v1/blobs/".to_string();
    url_str.append(walrus_blob_id);

    let nft = GalleryNFT {
        id: nft_uid,
        name,
        description,
        walrus_blob_id,
        url: url_str, // Key addition for explorers
        creator: sender,
        access_tier,
        created_at: tx_context::epoch(ctx),
    };

    event::emit(NFTMinted {
        nft_id,
        creator: sender,
        walrus_blob_id,
        access_tier,
    });

    transfer::public_transfer(nft, sender);
}

/// Transfer NFT to another address
public fun transfer_nft(nft: GalleryNFT, recipient: address, _ctx: &mut TxContext) {
    transfer::public_transfer(nft, recipient);
}

/// Update NFT description (only owner can do this)
public fun update_description(
    nft: &mut GalleryNFT,
    new_description: vector<u8>,
    _ctx: &mut TxContext,
) {
    nft.description = string::utf8(new_description);
}

/// Burn/delete the NFT (only owner can do this)
public fun burn(nft: GalleryNFT, _ctx: &mut TxContext) {
    let GalleryNFT {
        id,
        name: _,
        description: _,
        walrus_blob_id: _,
        url: _,
        creator: _,
        access_tier: _,
        created_at: _,
    } = nft;
    object::delete(id);
}

// === View Functions ===
public fun name(nft: &GalleryNFT): String { nft.name }

public fun description(nft: &GalleryNFT): String { nft.description }

public fun walrus_blob_id(nft: &GalleryNFT): String { nft.walrus_blob_id }

public fun url(nft: &GalleryNFT): String { nft.url } // Expose for explorers

public fun creator(nft: &GalleryNFT): address { nft.creator }

public fun access_tier(nft: &GalleryNFT): String { nft.access_tier }

public fun created_at(nft: &GalleryNFT): u64 { nft.created_at }

/// Check if an address owns an NFT with a specific access tier
public fun has_access_tier(nft: &GalleryNFT, required_tier: String): bool {
    nft.access_tier == required_tier
}

#[allow(lint(self_transfer))]
public fun init_display(publisher: &package::Publisher, ctx: &mut TxContext) {
    let mut display = display::new<GalleryNFT>(publisher, ctx);
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{url}"));
    display::add(&mut display, string::utf8(b"creator"), string::utf8(b"{creator}"));
    display::update_version(&mut display);
    transfer::public_transfer(display, ctx.sender());
}
