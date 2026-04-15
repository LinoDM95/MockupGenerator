"""
Stub services for automation pipeline (replace with real Vertex/Gemini/Gelato later).

All file outputs under MEDIA_ROOT for local dev.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile

from .models import ImageTask

logger = logging.getLogger(__name__)


def _media_path(*parts: str) -> Path:
    return Path(settings.MEDIA_ROOT).joinpath(*parts)


def service_upscale_image(task: ImageTask) -> None:
    """Stub: wait, copy original bytes as fake high-res PNG (same pixels)."""
    time.sleep(2)
    task.original_image.open("rb")
    try:
        raw = task.original_image.read()
    finally:
        task.original_image.close()

    name = f"hr_{task.id}.png"
    task.high_res_image.save(name, ContentFile(raw), save=False)
    task.save(update_fields=["high_res_image", "updated_at"])
    logger.info("service_upscale_image done task=%s", task.id)


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

    if not task.high_res_image:
        raise ValueError("high_res_image fehlt vor Mockup-Rendering.")

    task.high_res_image.open("rb")
    try:
        img = Image.open(task.high_res_image).convert("RGBA")
    finally:
        task.high_res_image.close()

    w, h = img.size
    try:
        font_lg = ImageFont.truetype("arial.ttf", 28)
        font_sm = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font_lg = ImageFont.load_default()
        font_sm = font_lg

    job_id = task.job_id
    rel_dir = Path("automation") / "jobs" / str(job_id) / str(task.id)
    abs_dir = _media_path(*rel_dir.parts)
    abs_dir.mkdir(parents=True, exist_ok=True)

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
        out = abs_dir / filename
        combined.save(out, format="PNG", optimize=True)
        rel = str(rel_dir / filename).replace("\\", "/")
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
