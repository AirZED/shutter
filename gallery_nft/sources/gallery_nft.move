/// Module: gallery_nft
module gallery_nft::gallery_nft;

use std::string::{Self, String};
use sui::address;
use sui::display;
use sui::event;
use sui::object::{Self, UID};
use sui::package;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ... (keep your existing imports and structs as-is)

/// NFT that gates access to a Walrus-stored image (or any URL)
public struct GalleryNFT has key, store {
    id: UID,
    /// Name/title of the image
    name: String,
    /// Description of the image
    description: String,
    /// Walrus blob ID for the image (optional if using external URL)
    walrus_blob_id: String,
    /// Full image URL for explorer display (Walrus or external)
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
    image_url: String, // Changed to image_url for generality
    access_tier: String,
}

/// Error codes
const EInvalidUrl: u64 = 1;
const EInvalidAccessTier: u64 = 2;

/// Mint a new Gallery NFT
/// Now accepts full image_url (e.g., Walrus blob URL or external like "https://i.imgur.com/abc.jpg")
/// walrus_blob_id is optional (pass empty string for external URLs)
public fun mint(
    name: String,
    description: String,
    walrus_blob_id: String, // Optional: pass blobId or ""
    image_url: String, // Required: full URL
    access_tier: String,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let nft_uid = object::new(ctx);
    let nft_id = object::uid_to_address(&nft_uid);

    // Validate inputs
    assert!(!image_url.is_empty(), EInvalidUrl);
    assert!(!access_tier.is_empty(), EInvalidAccessTier);

    let nft = GalleryNFT {
        id: nft_uid,
        name,
        description,
        walrus_blob_id, // Can be empty
        url: image_url, // Use passed URL directly
        creator: sender,
        access_tier,
        created_at: tx_context::epoch(ctx),
    };

    event::emit(NFTMinted {
        nft_id,
        creator: sender,
        image_url,
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
// Updated init_display to use image_url
public fun init_display(publisher: &package::Publisher, ctx: &mut TxContext) {
    let mut display = display::new<GalleryNFT>(publisher, ctx);
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{url}")); // Uses the full URL
    display::add(&mut display, string::utf8(b"creator"), string::utf8(b"{creator}"));
    display::update_version(&mut display);
    transfer::public_transfer(display, ctx.sender());
}
