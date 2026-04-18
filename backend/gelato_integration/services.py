"""HTTP client for the Gelato E-Commerce API (v1). Uses X-API-KEY authentication."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class GelatoApiError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Gelato API {status_code}: {detail}")


class GelatoClient:
    """Thin wrapper around the Gelato E-Commerce API.

    Docs: https://dashboard.gelato.com/docs/
    Base: https://ecommerce.gelatoapis.com/v1
    Auth: X-API-KEY header
    """

    def __init__(self, api_key: str) -> None:
        base_url = getattr(
            settings, "GELATO_API_BASE_URL", "https://ecommerce.gelatoapis.com/v1"
        )
        self._client = httpx.Client(
            base_url=base_url,
            headers={
                "X-API-KEY": api_key,
                "Content-Type": "application/json",
            },
            timeout=60.0,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> GelatoClient:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def _request(
        self,
        method: str,
        path: str,
        *,
        max_retries: int = 4,
        **kwargs: Any,
    ) -> httpx.Response:
        last_exc: Exception | None = None
        for attempt in range(max_retries):
            try:
                r = self._client.request(method, path, **kwargs)
            except httpx.RequestError as e:
                last_exc = e
                time.sleep(min(2**attempt, 30))
                continue

            if r.status_code == 429:
                ra = r.headers.get("Retry-After")
                try:
                    delay = float(ra) if ra else min(2**attempt, 60)
                except (TypeError, ValueError):
                    delay = min(2**attempt, 60)
                time.sleep(delay)
                continue

            if r.status_code >= 500:
                last_exc = GelatoApiError(r.status_code, r.text[:500])
                time.sleep(min(2**attempt, 30))
                continue

            return r

        if last_exc:
            raise last_exc
        raise RuntimeError("Gelato request failed after retries")

    def _get_json(self, path: str, **kwargs: Any) -> Any:
        r = self._request("GET", path, **kwargs)
        if not r.is_success:
            raise GelatoApiError(r.status_code, r.text[:500])
        return r.json()

    def _post_json(self, path: str, payload: dict, **kwargs: Any) -> Any:
        r = self._request("POST", path, json=payload, **kwargs)
        if not r.is_success:
            raise GelatoApiError(r.status_code, r.text[:500])
        return r.json()

    # ── Public API methods ──────────────────────────────────────────

    def list_stores(self) -> list[dict]:
        """GET /stores – list all stores for this API key.

        The endpoint is not prominently documented but available in the
        Gelato E-Commerce API.  Returns a list of store objects, each
        containing at least ``id`` and ``name``.
        """
        r = self._request("GET", "/stores", max_retries=2)
        if r.status_code == 404:
            return []
        if not r.is_success:
            raise GelatoApiError(r.status_code, r.text[:500])
        data = r.json()
        if isinstance(data, list):
            return data
        return data.get("stores", data.get("results", []))

    def get_products(self, store_id: str, *, offset: int = 0, limit: int = 50) -> dict:
        """GET /stores/{storeId}/products"""
        return self._get_json(
            f"/stores/{store_id}/products",
            params={"offset": offset, "limit": limit},
        )

    def get_template(self, template_id: str) -> dict:
        """GET /templates/{templateId}"""
        logger.debug("GelatoClient.get_template template_id=%r", template_id)
        data = self._get_json(f"/templates/{template_id}")
        n_var = len(data.get("variants", []) or [])
        logger.debug("get_template response variants=%s", n_var)
        return data

    def build_variants_payload(
        self, template_id: str, image_url: str,
    ) -> list[dict]:
        """Fetch template details and build per-variant imagePlaceholders.

        Each variant in the Gelato template defines placeholder names
        (e.g. ``ImageFront``).  This method injects *image_url* into every
        placeholder of every variant so a single artwork is applied to all
        sizes/colours.
        """
        logger.debug(
            "build_variants_payload template_id=%r image_url_prefix=%r…",
            template_id,
            image_url[:80],
        )
        tpl_data = self.get_template(template_id)
        variants = tpl_data.get("variants", [])
        result: list[dict] = []
        for v in variants:
            placeholders = v.get("imagePlaceholders", [])
            if not placeholders:
                logger.debug("  variant id=%s skip (no placeholders)", v.get("id"))
                continue
            ph_names = [p.get("name") for p in placeholders]
            logger.debug("  variant id=%s placeholders=%s", v.get("id"), ph_names)
            result.append({
                "templateVariantId": v["id"],
                "imagePlaceholders": [
                    {"name": p["name"], "fileUrl": image_url}
                    for p in placeholders
                ],
            })
        logger.debug("build_variants_payload done n_variants_out=%s", len(result))
        return result

    def create_product_from_template(
        self,
        *,
        store_id: str,
        template_id: str,
        title: str = "",
        description: str = "",
        tags: list[str] | None = None,
        free_shipping: bool = False,
        is_visible: bool = False,
        variants: list[dict] | None = None,
    ) -> dict:
        """POST /stores/{storeId}/products:create-from-template

        When *variants* is provided the payload includes per-variant
        ``imagePlaceholders`` so Gelato injects the design into every
        product variant.
        """
        payload: dict[str, Any] = {
            "templateId": template_id,
            "title": title or "Untitled",
            "description": description or "",
            "isVisibleInTheOnlineStore": is_visible,
        }
        if tags:
            payload["tags"] = tags
        if variants:
            payload["variants"] = variants
        logger.debug(
            "create_product_from_template POST store_id=%r templateId=%r has_variants=%s payload_keys=%s",
            store_id,
            template_id,
            bool(variants),
            list(payload.keys()),
        )
        out = self._post_json(
            f"/stores/{store_id}/products:create-from-template",
            payload,
        )
        if isinstance(out, dict):
            logger.debug(
                "create_product_from_template response keys=%s",
                list(out.keys())[:12],
            )
        else:
            logger.debug(
                "create_product_from_template response type=%s",
                type(out).__name__,
            )
        return out

    def delete_product(self, store_id: str, product_id: str) -> bool:
        """DELETE /stores/{storeId}/products/{productId}

        Returns True if the product was deleted (or already gone).
        """
        r = self._request("DELETE", f"/stores/{store_id}/products/{product_id}", max_retries=2)
        if r.is_success or r.status_code == 404:
            return True
        logger.warning("Gelato delete product %s → %d: %s", product_id, r.status_code, r.text[:200])
        return False

    def list_product_images(self, store_id: str, product_id: str) -> list[dict]:
        """GET /stores/{storeId}/products/{productId}/images

        Returns a list of image objects or an empty list if the endpoint
        is not available.
        """
        try:
            r = self._request(
                "GET", f"/stores/{store_id}/products/{product_id}/images",
                max_retries=1,
            )
            if not r.is_success:
                return []
            data = r.json()
            if isinstance(data, list):
                return data
            return data.get("images", data.get("results", []))
        except Exception:
            return []

    def delete_product_image(self, store_id: str, product_id: str, image_id: str) -> bool:
        """DELETE /stores/{storeId}/products/{productId}/images/{imageId}

        Returns True on success or if the image was already gone.
        Falls back gracefully if the endpoint doesn't exist.
        """
        try:
            r = self._request(
                "DELETE",
                f"/stores/{store_id}/products/{product_id}/images/{image_id}",
                max_retries=1,
            )
            return r.is_success or r.status_code == 404
        except Exception:
            return False

    def delete_all_product_images(self, store_id: str, product_id: str) -> int:
        """Try to remove all auto-generated mockup images from a product.

        Returns the number of successfully deleted images.
        """
        images = self.list_product_images(store_id, product_id)
        if not images:
            return 0
        count = 0
        for img in images:
            img_id = img.get("id", "")
            if img_id and self.delete_product_image(store_id, product_id, img_id):
                count += 1
        if count:
            logger.info("Deleted %d auto-generated mockup images from product %s", count, product_id)
        return count

    def verify_key(self) -> list[dict]:
        """Verify the API key by listing stores.

        Returns a list of stores or raises GelatoApiError on 401.
        """
        stores = self.list_stores()
        if stores:
            return stores
        raise GelatoApiError(
            404,
            "API-Key gültig, aber keine Stores gefunden. "
            "Bitte erstelle zuerst einen Store im Gelato Dashboard.",
        )
