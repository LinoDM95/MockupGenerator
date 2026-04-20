"""
Stub services for automation pipeline (replace with real Vertex/Gemini/Gelato later).

Dateiausgaben über Django ``default_storage`` (lokal oder R2 je nach Settings).
"""

from __future__ import annotations

import logging
import time
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from core.object_storage_layout import P_AUTOMATION

from .models import ImageTask

logger = logging.getLogger(__name__)


def service_upscale_image(task: ImageTask) -> None:
    """Stub: wartet nur — **kein** zweites Objekt im Storage (Original reicht für Pipeline).

    Echtes Upscale (Vertex o. ä.) würde hier ``high_res_image`` befüllen; Mockups nutzen
    dann ``high_res_image``, sonst ``original_image``.
    """
    time.sleep(2)
    logger.info("service_upscale_image stub (no duplicate R2 object) task=%s", task.id)


def service_generate_seo(task: ImageTask, ai_model_name: str) -> None:
    """Stub: dummy SEO fields; replace with Gemini later."""
    time.sleep(2)
    base = Path(task.original_image.name).stem[:40] or "design"
    task.generated_title = f"Stub title — {base} ({ai_model_name})"
    task.generated_tags = ["stub", "automation", "mockup", base[:20]]
    task.generated_description = (
        f"Automatisch generierte Beschreibung (Stub) für Modell {ai_model_name}. "
        f"Motiv: {base}."
    )
    task.save(
        update_fields=[
            "generated_title",
            "generated_tags",
            "generated_description",
            "updated_at",
        ],
    )
    logger.info("service_generate_seo done task=%s", task.id)


def service_render_server_mockups(task: ImageTask, template_set_id: str) -> None:
    """
    Pillow: lädt das echte Vorlagen-Set (core.TemplateSet) des Nutzers;
    erzeugt pro Vorlage eine PNG (Stub-Overlay mit Set- und Vorlagenname).
    """
    from django.utils.text import slugify

    from core.models import TemplateSet
    from PIL import Image, ImageDraw, ImageFont

    time.sleep(2)

    ts = (
        TemplateSet.objects.filter(pk=template_set_id, user=task.job.user)
        .prefetch_related("templates")
        .first()
    )
    if not ts:
        raise ValueError(
            "Vorlagen-Set nicht gefunden oder gehoert nicht zu diesem Nutzer."
        )

    base_img = task.high_res_image if task.high_res_image else task.original_image
    if not base_img:
        raise ValueError("original_image fehlt vor Mockup-Rendering.")

    base_img.open("rb")
    try:
        img = Image.open(base_img).convert("RGBA")
    finally:
        base_img.close()

    w, h = img.size
    try:
        font_lg = ImageFont.truetype("arial.ttf", 28)
        font_sm = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font_lg = ImageFont.load_default()
        font_sm = font_lg

    job_id = task.job_id
    rel_dir = f"{P_AUTOMATION}/jobs/{job_id}/tasks/{task.id}/mockups"

    templates = list(ts.templates.order_by("order", "name"))
    paths: list[str] = []

    def write_mockup(filename: str, line_a: str, line_b: str) -> None:
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        draw.text((10, 10), line_a, fill=(255, 80, 80, 230), font=font_lg)
        draw.text((10, 46), line_b[:200], fill=(255, 255, 255, 210), font=font_sm)
        draw.text(
            (max(8, w // 2 - 160), h // 2),
            "Automation (Pillow)",
            fill=(220, 220, 255, 160),
            font=font_sm,
        )
        combined = Image.alpha_composite(img, overlay).convert("RGB")
        buffer = BytesIO()
        combined.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)
        rel = f"{rel_dir}/{filename}".replace("\\", "/")
        default_storage.save(rel, ContentFile(buffer.read()))
        paths.append(rel)

    if not templates:
        write_mockup(
            "00_keine_vorlage.png",
            f"Set: {ts.name}",
            "Diesem Set sind keine Einzelvorlagen zugeordnet.",
        )
    else:
        for idx, tmpl in enumerate(templates):
            slug = slugify(tmpl.name)[:70] or "vorlage"
            fn = f"{idx + 1:02d}_{slug}.png"
            line_b = f"Vorlage: {tmpl.name}  ·  {tmpl.width}×{tmpl.height}px"
            write_mockup(fn, f"Set: {ts.name}", line_b)

    task.mockup_paths = paths
    task.save(update_fields=["mockup_paths", "updated_at"])
    logger.info(
        "service_render_server_mockups task=%s set=%r templates=%s",
        task.id,
        ts.name,
        len(paths),
    )


def service_export_to_gelato(task: ImageTask, gelato_profile: str) -> None:
    """Stub: would push to Gelato API; no-op for local tests."""
    time.sleep(2)
    logger.info(
        "service_export_to_gelato stub task=%s profile=%s title=%r",
        task.id,
        gelato_profile,
        task.generated_title,
    )
