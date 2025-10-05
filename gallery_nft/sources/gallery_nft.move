/// Module: gallery_nft
module gallery_nft::gallery_nft;

use std::string::{Self, String};
use sui::display;
use sui::event;
use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

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

/// Walrus aggregator gateway for testnet
const WALRUS_AGGREGATOR: vector<u8> = b"https://aggregator.walrus-testnet.walrus.space/v1/blobs/";

/// Mint a new Gallery NFT
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
    assert!(!std::vector::is_empty(&walrus_blob_id), EInvalidBlobId);
    assert!(!std::vector::is_empty(&access_tier), EInvalidAccessTier);

    // Build standard URL for image display
    let url = std::vector::empty();
    std::vector::append(&mut url, WALRUS_AGGREGATOR);
    std::vector::append(&mut url, walrus_blob_id);
    let url_str = string::utf8(url);

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
        walrus_blob_id: string::utf8(walrus_blob_id),
        access_tier: string::utf8(access_tier),
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

/// Optional: Display template for rich rendering in wallets/explorers
public entry fun init_display(display: &mut display::Display<GalleryNFT>, ctx: &mut TxContext) {
    let builder = display::new<GalleryNFT>(ctx);
    display::add(&mut builder, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut builder, string::utf8(b"description"), string::utf8(b"{description}"));
    display::add(&mut builder, string::utf8(b"image_url"), string::utf8(b"{url}"));
    display::add(&mut builder, string::utf8(b"creator"), string::utf8(b"{creator}"));
    display::update_version(display, builder);
}
