#[test_only]
module gallery_nft::gallery_nft_tests;

use gallery_nft::gallery_nft::{Self, GalleryNFT};
use std::string::{utf8, String};
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils;

const ADMIN: address = @0xAD;
const USER1: address = @0xB1;
const USER2: address = @0xB2;

const DUMMY_AGGREGATOR: vector<u8> = b"https://aggregator.walrus-testnet.walrus.space/v1/blobs/";

// === Test Helpers ===

fun setup_test(): Scenario {
    let mut scenario = ts::begin(ADMIN);
    {
        let ctx = ts::ctx(&mut scenario);
    };
    scenario
}

fun mint_test_nft(scenario: &mut Scenario, sender: address) {
    ts::next_tx(scenario, sender);
    {
        let ctx = ts::ctx(scenario);
        let blob_id = b"QmAbCdEf123456789";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"Sunset Photo"),
            utf8(b"Beautiful sunset at the beach"),
            utf8(blob_id),
            image_url,
            utf8(b"premium"),
            ctx,
        );
    };
}

// === Tests ===

#[test]
fun test_mint_nft() {
    let mut scenario = setup_test();

    // Mint NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        let blob_id = b"QmTestBlobId12345";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"My First Image"),
            utf8(b"This is my first uploaded image"),
            utf8(blob_id),
            image_url,
            utf8(b"public"),
            ctx,
        );
    };

    // Check that NFT was created and sent to USER1
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);

        assert!(gallery_nft::name(&nft) == utf8(b"My First Image"), 0);
        assert!(gallery_nft::description(&nft) == utf8(b"This is my first uploaded image"), 1);
        assert!(gallery_nft::walrus_blob_id(&nft) == utf8(b"QmTestBlobId12345"), 2);
        assert!(
            gallery_nft::url(&nft) == utf8(concat_vec(DUMMY_AGGREGATOR, b"QmTestBlobId12345")),
            6,
        ); // New: Check URL
        assert!(gallery_nft::creator(&nft) == USER1, 3);
        assert!(gallery_nft::access_tier(&nft) == utf8(b"public"), 4);

        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
fun test_mint_multiple_nfts() {
    let mut scenario = setup_test();

    // USER1 mints first NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        let blob_id = b"BlobId1";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"Image 1"),
            utf8(b"First image"),
            utf8(blob_id),
            image_url,
            utf8(b"public"),
            ctx,
        );
    };

    // USER2 mints second NFT
    ts::next_tx(&mut scenario, USER2);
    {
        let ctx = ts::ctx(&mut scenario);
        let blob_id = b"BlobId2";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"Image 2"),
            utf8(b"Second image"),
            utf8(blob_id),
            image_url,
            utf8(b"premium"),
            ctx,
        );
    };

    // Verify USER1's NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        assert!(gallery_nft::name(&nft) == utf8(b"Image 1"), 0);
        assert!(gallery_nft::creator(&nft) == USER1, 1);
        ts::return_to_sender(&scenario, nft);
    };

    // Verify USER2's NFT
    ts::next_tx(&mut scenario, USER2);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        assert!(gallery_nft::name(&nft) == utf8(b"Image 2"), 0);
        assert!(gallery_nft::creator(&nft) == USER2, 1);
        assert!(gallery_nft::access_tier(&nft) == utf8(b"premium"), 2);
        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
fun test_transfer_nft() {
    let mut scenario = setup_test();

    // USER1 mints NFT
    mint_test_nft(&mut scenario, USER1);

    // USER1 transfers NFT to USER2
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        gallery_nft::transfer_nft(nft, USER2, ctx);
    };

    // Verify USER2 now owns the NFT
    ts::next_tx(&mut scenario, USER2);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        assert!(gallery_nft::name(&nft) == utf8(b"Sunset Photo"), 0);
        assert!(gallery_nft::creator(&nft) == USER1, 1); // Creator remains USER1
        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
fun test_update_description() {
    let mut scenario = setup_test();

    // Mint NFT
    mint_test_nft(&mut scenario, USER1);

    // Update description
    ts::next_tx(&mut scenario, USER1);
    {
        let mut nft = ts::take_from_sender<GalleryNFT>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        gallery_nft::update_description(&mut nft, b"Updated description", ctx);

        assert!(gallery_nft::description(&nft) == utf8(b"Updated description"), 0);

        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
fun test_burn_nft() {
    let mut scenario = setup_test();

    // Mint NFT
    mint_test_nft(&mut scenario, USER1);

    // Burn NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        gallery_nft::burn(nft, ctx);
    };

    // Verify NFT no longer exists
    ts::next_tx(&mut scenario, USER1);
    {
        assert!(!ts::has_most_recent_for_sender<GalleryNFT>(&scenario), 0);
    };

    ts::end(scenario);
}

#[test]
fun test_has_access_tier() {
    let mut scenario = setup_test();

    // Mint premium NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        let blob_id = b"PremiumBlobId";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"Premium Image"),
            utf8(b"Premium access only"),
            utf8(blob_id),
            image_url,
            utf8(b"premium"),
            ctx,
        );
    };

    // Check access tier
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);

        assert!(gallery_nft::has_access_tier(&nft, utf8(b"premium")), 0);
        assert!(!gallery_nft::has_access_tier(&nft, utf8(b"public")), 1);
        assert!(!gallery_nft::has_access_tier(&nft, utf8(b"exclusive")), 2);

        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
fun test_different_access_tiers() {
    let mut scenario = setup_test();

    let tiers = vector[utf8(b"public"), utf8(b"premium"), utf8(b"exclusive"), utf8(b"vip")];
    let mut i = 0;

    while (i < std::vector::length(&tiers)) {
        let tier = *std::vector::borrow(&tiers, i);
        let blob_id = concat_vec(b"TestBlobId", std::vector::borrow(&tiers, i)); // Dummy blob ID per tier

        ts::next_tx(&mut scenario, USER1);
        {
            let ctx = ts::ctx(&mut scenario);
            let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
            gallery_nft::mint(
                utf8(b"Test Image"),
                utf8(b"Test Description"),
                utf8(blob_id),
                image_url,
                tier,
                ctx,
            );
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let nft = ts::take_from_sender<GalleryNFT>(&scenario);
            assert!(gallery_nft::access_tier(&nft) == tier, i);

            let ctx = ts::ctx(&mut scenario);
            gallery_nft::burn(nft, ctx);
        };

        i = i + 1;
    };

    ts::end(scenario);
}

#[test]
fun test_view_functions() {
    let mut scenario = setup_test();

    // Mint NFT with specific values
    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        let blob_id = b"TestBlobId123";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"Test Name"),
            utf8(b"Test Description"),
            utf8(blob_id),
            image_url,
            utf8(b"premium"),
            ctx,
        );
    };

    // Test all view functions
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);

        assert!(gallery_nft::name(&nft) == utf8(b"Test Name"), 0);
        assert!(gallery_nft::description(&nft) == utf8(b"Test Description"), 1);
        assert!(gallery_nft::walrus_blob_id(&nft) == utf8(b"TestBlobId123"), 2);
        assert!(gallery_nft::url(&nft) == utf8(concat_vec(DUMMY_AGGREGATOR, b"TestBlobId123")), 7); // New: Check URL
        assert!(gallery_nft::creator(&nft) == USER1, 3);
        assert!(gallery_nft::access_tier(&nft) == utf8(b"premium"), 4);
        assert!(gallery_nft::created_at(&nft) >= 0, 5);

        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = gallery_nft::EInvalidUrl)]
fun test_mint_with_empty_url_fails() {
    let mut scenario = setup_test();

    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        gallery_nft::mint(
            utf8(b"Test Name"),
            utf8(b"Test Description"),
            utf8(b"TestBlobId"), // Valid blob ID
            utf8(b""), // Empty URL
            utf8(b"premium"),
            ctx,
        );
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = gallery_nft::EInvalidAccessTier)]
fun test_mint_with_empty_access_tier_fails() {
    let mut scenario = setup_test();

    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        let blob_id = b"TestBlobId";
        let image_url = utf8(concat_vec(DUMMY_AGGREGATOR, blob_id));
        gallery_nft::mint(
            utf8(b"Test Name"),
            utf8(b"Test Description"),
            utf8(blob_id),
            image_url,
            utf8(b""), // Empty access tier
            ctx,
        );
    };

    ts::end(scenario);
}
