"""Upscaler: reine Service-/Hilfsfunktionen (ohne DB)."""

import math
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from PIL import Image as PILImage

from upscaler import limits
from upscaler.services import (
    OVERLAP_SRC,
    UpscaleAPIError,
    _call_replicate_api,
    _replicate_client_run_to_file_output_with_retry,
    _tiling_grid_dims,
    native_steps_for_total_factor,
    smallest_cover_factor,
)


class NativeStepsTests(SimpleTestCase):
    def test_decompose_8_is_4_then_2(self) -> None:
        self.assertEqual(native_steps_for_total_factor(8), [4, 2])

    def test_decompose_16_is_4_then_4(self) -> None:
        self.assertEqual(native_steps_for_total_factor(16), [4, 4])

    def test_decompose_2_and_4(self) -> None:
        self.assertEqual(native_steps_for_total_factor(2), [2])
        self.assertEqual(native_steps_for_total_factor(4), [4])


class CoverFactorTests(SimpleTestCase):
    def test_smallest_cover(self) -> None:
        self.assertEqual(smallest_cover_factor(1.0), 2)
        self.assertEqual(smallest_cover_factor(3.2), 4)
        self.assertEqual(smallest_cover_factor(5.0), 8)
        self.assertEqual(smallest_cover_factor(16.0), 16)

    def test_over_16_returns_none(self) -> None:
        self.assertIsNone(smallest_cover_factor(16.1))


class TilingGridContractTests(SimpleTestCase):
    def test_panorama_needs_multi_column_grid_while_total_area_stays_under_cap(
        self,
    ) -> None:
        factor_int = 4
        max_tile_px = int(math.isqrt(limits.MAX_OUTPUT_PIXELS))
        max_tile_src = max_tile_px // factor_int
        overlap = min(OVERLAP_SRC, max_tile_src // 4)
        step = max_tile_src - overlap
        w, h = 8000, 50
        cols, rows = _tiling_grid_dims(w, h, overlap, step)
        self.assertGreater(cols, 1)
        self.assertEqual(rows, 1)
        out_px = (w * factor_int) * (h * factor_int)
        self.assertLess(out_px, limits.MAX_OUTPUT_PIXELS)


class ReplicateErrorMappingTests(SimpleTestCase):
    def test_402_insufficient_credit_maps_to_402(self) -> None:
        client = MagicMock()
        client.run.side_effect = Exception(
            "ReplicateError Details: title: Insufficient credit status: 402 "
            "detail: You have insufficient credit to run this model."
        )
        img = PILImage.new("RGB", (8, 8), color=(1, 2, 3))
        with self.assertRaises(UpscaleAPIError) as ctx:
            _call_replicate_api(client, "nightmareai/real-esrgan", img, 4)
        self.assertEqual(ctx.exception.status_code, 402)
        self.assertIn("Guthaben", str(ctx.exception))


@patch("upscaler.services.time.sleep", autospec=True)
@patch("upscaler.services._replicate_file_output_from_run", autospec=True)
class ReplicateTileRetryTests(SimpleTestCase):
    def test_503_backoff_api_then_fileoutput_ok(
        self, mock_fo: MagicMock, _mock_sleep: MagicMock
    ) -> None:
        from replicate.helpers import FileOutput

        fo = MagicMock(spec=FileOutput)
        mock_fo.side_effect = [
            UpscaleAPIError("unavailable", status_code=503),
            fo,
        ]
        c = MagicMock()
        img = PILImage.new("RGB", (8, 8), color=(1, 2, 3))
        out = _replicate_client_run_to_file_output_with_retry(
            c, "nightmareai/real-esrgan", img, 4
        )
        self.assertIs(out, fo)
        self.assertEqual(mock_fo.call_count, 2)
