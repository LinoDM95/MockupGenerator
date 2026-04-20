"""Zentrale Normalisierung für Etsy-API-Responses (snake_case / camelCase)."""

from __future__ import annotations


def get_listing_id(listing: dict) -> int | None:
    raw = listing.get("listing_id") or listing.get("listingId")
    return int(raw) if raw is not None else None


def listing_images_from_embed(listing: dict) -> list | None:
    """Wenn die Listing-Response Bilder inkludiert (`includes=Images`), hier extrahieren."""
    raw = listing.get("images")
    if raw is None:
        raw = listing.get("Images")
    if isinstance(raw, list):
        return raw
    return None


def get_image_id(img: dict) -> int | None:
    raw = img.get("listing_image_id") or img.get("listingImageId")
    return int(raw) if raw is not None else None


def get_image_rank(img: dict) -> int:
    return int(img.get("rank") or img.get("rank_order") or 0)


def get_results(response: dict, fallback_key: str = "") -> list:
    results = response.get("results")
    if results is not None:
        return results
    if fallback_key:
        return response.get(fallback_key) or []
    return []


def get_user_id(user_data: dict) -> int:
    return int(user_data.get("user_id", user_data.get("userId", 0)))


def get_shop_id(shop: dict) -> int | None:
    raw = shop.get("shop_id") or shop.get("shopId")
    return int(raw) if raw is not None else None
