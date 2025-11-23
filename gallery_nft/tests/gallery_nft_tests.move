#[test_only]
module gallery_nft::gallery_nft_tests;

use gallery_nft::gallery_nft::{Self, GalleryNFT};
use std::string;
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils;

const ADMIN: address = @0xAD;
const USER1: address = @0xB1;
const USER2: address = @0xB2;

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
        gallery_nft::mint(
            b"Sunset Photo".to_string(),
            b"Beautiful sunset at the beach".to_string(),
            b"QmAbCdEf123456789".to_string(),
            b"premium".to_string(),
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
        gallery_nft::mint(
            b"My First Image".to_string(),
            b"This is my first uploaded image".to_string(),
            b"QmTestBlobId12345".to_string(),
            b"public".to_string(),
            ctx,
        );
    };

    // Check that NFT was created and sent to USER1
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);

        assert!(gallery_nft::name(&nft) == string::utf8(b"My First Image"), 0);
        assert!(gallery_nft::description(&nft) == string::utf8(b"This is my first uploaded image"), 1);
        assert!(gallery_nft::walrus_blob_id(&nft) == string::utf8(b"QmTestBlobId12345"), 2);
        assert!(gallery_nft::creator(&nft) == USER1, 3);
        assert!(gallery_nft::access_tier(&nft) == string::utf8(b"public"), 4);

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
        gallery_nft::mint(
            b"Image 1".to_string(),
            b"First image".to_string(),
            b"BlobId1".to_string(),
            b"public".to_string(),
            ctx,
        );
    };

    // USER2 mints second NFT
    ts::next_tx(&mut scenario, USER2);
    {
        let ctx = ts::ctx(&mut scenario);
        gallery_nft::mint(
            b"Image 2".to_string(),
            b"Second image".to_string(),
            b"BlobId2".to_string(),
            b"premium".to_string(),
            ctx,
        );
    };

    // Verify USER1's NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        assert!(gallery_nft::name(&nft) == string::utf8(b"Image 1"), 0);
        assert!(gallery_nft::creator(&nft) == USER1, 1);
        ts::return_to_sender(&scenario, nft);
    };

    // Verify USER2's NFT
    ts::next_tx(&mut scenario, USER2);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);
        assert!(gallery_nft::name(&nft) == string::utf8(b"Image 2"), 0);
        assert!(gallery_nft::creator(&nft) == USER2, 1);
        assert!(gallery_nft::access_tier(&nft) == string::utf8(b"premium"), 2);
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
        assert!(gallery_nft::name(&nft) == string::utf8(b"Sunset Photo"), 0);
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

        assert!(gallery_nft::description(&nft) == string::utf8(b"Updated description"), 0);

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
        gallery_nft::mint(
            b"Premium Image".to_string(),
            b"Premium access only".to_string(),
            b"PremiumBlobId".to_string(),
            b"premium".to_string(),
            ctx,
        );
    };

    // Check access tier
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);

        assert!(gallery_nft::has_access_tier(&nft, string::utf8(b"premium")), 0);
        assert!(!gallery_nft::has_access_tier(&nft, string::utf8(b"public")), 1);
        assert!(!gallery_nft::has_access_tier(&nft, string::utf8(b"exclusive")), 2);

        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
fun test_different_access_tiers() {
    let mut scenario = setup_test();

    let tiers = vector[b"public", b"premium", b"exclusive", b"vip"];
    let mut i = 0;

    while (i < std::vector::length(&tiers)) {
        let tier = *std::vector::borrow(&tiers, i);

        ts::next_tx(&mut scenario, USER1);
        {
            let ctx = ts::ctx(&mut scenario);
            gallery_nft::mint(
                b"Test Image".to_string(),
                b"Test Description".to_string(),
                b"TestBlobId".to_string(),
                tier.to_string(),
                ctx,
            );
        };

        ts::next_tx(&mut scenario, USER1);
        {
            let nft = ts::take_from_sender<GalleryNFT>(&scenario);
            assert!(gallery_nft::access_tier(&nft) == string::utf8(tier), i);

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
        gallery_nft::mint(
            b"Test Name".to_string(),
            b"Test Description".to_string(),
            b"TestBlobId123".to_string(),
            b"premium".to_string(),
            ctx,
        );
    };

    // Test all view functions
    ts::next_tx(&mut scenario, USER1);
    {
        let nft = ts::take_from_sender<GalleryNFT>(&scenario);

        assert!(gallery_nft::name(&nft) == string::utf8(b"Test Name"), 0);
        assert!(gallery_nft::description(&nft) == string::utf8(b"Test Description"), 1);
        assert!(gallery_nft::walrus_blob_id(&nft) == string::utf8(b"TestBlobId123"), 2);
        assert!(gallery_nft::creator(&nft) == USER1, 3);
        assert!(gallery_nft::access_tier(&nft) == string::utf8(b"premium"), 4);
        assert!(gallery_nft::created_at(&nft) >= 0, 5);

        ts::return_to_sender(&scenario, nft);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = gallery_nft::EInvalidBlobId)]
fun test_mint_with_empty_blob_id_fails() {
    let mut scenario = setup_test();

    ts::next_tx(&mut scenario, USER1);
    {
        let ctx = ts::ctx(&mut scenario);
        gallery_nft::mint(
            b"Test Name".to_string(),
            b"Test Description".to_string(),
            b"".to_string(), // Empty blob ID
            b"premium".to_string(),
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
        gallery_nft::mint(
            b"Test Name".to_string(),
            b"Test Description".to_string(),
            b"TestBlobId".to_string(),
            b"".to_string(), // Empty access tier
            ctx,
        );
    };

    ts::end(scenario);
}
