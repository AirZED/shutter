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

/// One-Time-Witness (OTW) for claiming the Publisher object
/// Must be named after the module in UPPERCASE with only the drop ability
public struct GALLERY_NFT has drop {}

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

/// Gallery object stored on-chain
public struct Gallery has key, store {
    id: UID,
    /// Unique gallery identifier
    gallery_id: String,
    /// Gallery title
    title: String,
    /// Gallery description
    description: String,
    /// Thumbnail image URL
    thumbnail: String,
    /// Number of media items in the gallery
    media_count: u64,
    /// Whether the gallery is locked (requires NFT access)
    is_locked: bool,
    /// Required NFT address for access (if locked)
    required_nft: String,
    /// Gallery owner/creator address
    owner: address,
    /// Visibility: "public" or "private"
    visibility: String,
    /// Gallery metadata URI (Walrus blob containing full gallery data)
    gallery_uri: String,
    /// Creation timestamp (epoch)
    created_at: u64,
    /// Last update timestamp (epoch)
    updated_at: u64,
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
const EInvalidGalleryId: u64 = 3;
const EInvalidTitle: u64 = 4;

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

// === Getter Functions ===

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

/// Get full image URL
public fun url(nft: &GalleryNFT): String {
    nft.url
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

/// Check if NFT has a specific access tier
public fun has_access_tier(nft: &GalleryNFT, tier: String): bool {
    nft.access_tier == tier
}

/// Module initializer function
/// This is automatically called when the package is deployed or upgraded
/// It claims the Publisher object and initializes Display metadata
fun init(otw: GALLERY_NFT, ctx: &mut TxContext) {
    // Claim the Publisher object using the One-Time-Witness
    let publisher = package::claim(otw, ctx);

    // Initialize Display metadata immediately
    let mut display = display::new<GalleryNFT>(
        &publisher,
        ctx,
    );

    // Standard Display fields that wallets recognize (required for NFT visibility)
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));

    // Image fields - wallets look for both "image" and "image_url"
    // "image" is the primary field most wallets check first
    display::add(&mut display, string::utf8(b"image"), string::utf8(b"{url}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{url}"));

    // Additional metadata fields for better wallet display
    display::add(&mut display, string::utf8(b"creator"), string::utf8(b"{creator}"));
    display::add(&mut display, string::utf8(b"access_tier"), string::utf8(b"{access_tier}"));
    display::add(&mut display, string::utf8(b"walrus_blob_id"), string::utf8(b"{walrus_blob_id}"));

    // Link fields - some wallets use these for navigation
    display::add(
        &mut display,
        string::utf8(b"link"),
        string::utf8(b"https://testnet.suivision.xyz/object/{id}"),
    );
    display::add(
        &mut display,
        string::utf8(b"project_url"),
        string::utf8(b"https://testnet.suivision.xyz"),
    );

    // Update version to finalize the Display metadata
    display::update_version(&mut display);

    // Transfer both Publisher and Display objects to the deployer
    // The Publisher can be used for future upgrades or additional Display configurations
    // The Display object makes metadata available for all NFTs of this type
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}

/// Initialize Display metadata for GalleryNFT
/// NOTE: This function is kept for backward compatibility, but Display is now
/// automatically initialized in the init() function during package deployment/upgrade.
/// You only need to call this if you want to update Display metadata after initial deployment.
/// This must be called once by the package publisher after deployment
/// Wallets use Display metadata to show NFTs in their UI
///
/// To call this function, you need the Publisher object from package deployment:
/// sui client call --package <PACKAGE_ID> --module gallery_nft --function init_display --args <PUBLISHER_OBJECT_ID> --gas-budget 10000000
public fun init_display(publisher: &package::Publisher, ctx: &mut TxContext) {
    let mut display = display::new<GalleryNFT>(
        publisher,
        ctx,
    );

    // Standard Display fields that wallets recognize (required for NFT visibility)
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));

    // Image fields - wallets look for both "image" and "image_url"
    // "image" is the primary field most wallets check first
    display::add(&mut display, string::utf8(b"image"), string::utf8(b"{url}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{url}"));

    // Additional metadata fields for better wallet display
    display::add(&mut display, string::utf8(b"creator"), string::utf8(b"{creator}"));
    display::add(&mut display, string::utf8(b"access_tier"), string::utf8(b"{access_tier}"));
    display::add(&mut display, string::utf8(b"walrus_blob_id"), string::utf8(b"{walrus_blob_id}"));

    // Link fields - some wallets use these for navigation
    display::add(
        &mut display,
        string::utf8(b"link"),
        string::utf8(b"https://testnet.suivision.xyz/object/{id}"),
    );
    display::add(
        &mut display,
        string::utf8(b"project_url"),
        string::utf8(b"https://testnet.suivision.xyz"),
    );

    // Update version to finalize the Display metadata
    display::update_version(&mut display);

    // Transfer Display object to package publisher (they own it)
    // This makes the Display metadata available for all NFTs of this type
    transfer::public_transfer(display, ctx.sender());
}

/// Create a new Gallery on-chain
public fun create_gallery(
    gallery_id: String,
    title: String,
    description: String,
    thumbnail: String,
    media_count: u64,
    is_locked: bool,
    required_nft: String,
    visibility: String,
    gallery_uri: String,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let gallery_uid = object::new(ctx);

    // Validate inputs
    assert!(!gallery_id.is_empty(), EInvalidGalleryId);
    assert!(!title.is_empty(), EInvalidTitle);

    let gallery = Gallery {
        id: gallery_uid,
        gallery_id,
        title,
        description,
        thumbnail,
        media_count,
        is_locked,
        required_nft,
        owner: sender,
        visibility,
        gallery_uri,
        created_at: tx_context::epoch(ctx),
        updated_at: tx_context::epoch(ctx),
    };

    transfer::public_transfer(gallery, sender);
}

/// Update gallery metadata
public fun update_gallery(
    gallery: &mut Gallery,
    new_title: String,
    new_description: String,
    new_media_count: u64,
    new_gallery_uri: String,
    ctx: &mut TxContext,
) {
    assert!(!new_title.is_empty(), EInvalidTitle);
    gallery.title = new_title;
    gallery.description = new_description;
    gallery.media_count = new_media_count;
    gallery.gallery_uri = new_gallery_uri;
    gallery.updated_at = tx_context::epoch(ctx);
}

/// Get gallery ID
public fun gallery_id(gallery: &Gallery): String {
    gallery.gallery_id
}

/// Get gallery title
public fun title(gallery: &Gallery): String {
    gallery.title
}

/// Get gallery description
public fun gallery_description(gallery: &Gallery): String {
    gallery.description
}

/// Get gallery owner
public fun owner(gallery: &Gallery): address {
    gallery.owner
}

/// Get gallery URI
public fun gallery_uri(gallery: &Gallery): String {
    gallery.gallery_uri
}
