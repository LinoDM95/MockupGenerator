"""Etsy: Serializer- und Hilfsfunktions-Tests (ohne HTTP)."""

from django.test import TestCase

from ..serializers import BulkJobCreateSerializer, MAX_BULK_ITEMS
from ..services.rate_limit import EtsyRateLimiter


class EtsyRateLimiterTests(TestCase):
    def test_wait_does_not_crash(self) -> None:
        lim = EtsyRateLimiter(100.0)
        lim.wait()
        lim.wait()


class BulkJobValidationTests(TestCase):
    def test_rejects_over_100_items(self) -> None:
        items = [{"listing_id": i, "deletes": [], "uploads": []} for i in range(1, MAX_BULK_ITEMS + 2)]
        ser = BulkJobCreateSerializer(data={"items": items})
        self.assertFalse(ser.is_valid())
        self.assertIn("items", ser.errors)

    def test_requires_deletes_or_uploads(self) -> None:
        ser = BulkJobCreateSerializer(
            data={"items": [{"listing_id": 1, "deletes": [], "uploads": []}]},
        )
        self.assertFalse(ser.is_valid())

    def test_accepts_deletes_only(self) -> None:
        ser = BulkJobCreateSerializer(
            data={"items": [{"listing_id": 42, "deletes": [9, 10], "uploads": []}]},
        )
        self.assertTrue(ser.is_valid(), ser.errors)
