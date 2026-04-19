from django.test import SimpleTestCase

from upscaler.services import (
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
