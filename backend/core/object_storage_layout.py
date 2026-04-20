"""R2/S3-Objektschlüssel: ein App-weites Präfix und nachvollziehbare Segmente.

Alle Keys dieser Anwendung beginnen mit ``ce/`` (Creative Engine), damit in einem
geteilten Bucket sofort erkennbar ist, welche Software sie geschrieben hat. Danach
folgt das Fachmodul (``core``, ``gelato``, ``etsy``, ``automation``).

Layout (v2)::

    ce/core/template_backgrounds/users/<user_id>/<YYYY>/<MM>/<uuid>.<ext>
    ce/gelato/temp_designs/users/<user_id>/<YYYY>/<MM>/<uuid>.<ext>
    ce/gelato/artworks/users/<user_id>/<12hex>_<filename>
    ce/gelato/product_exports/users/<user_id>/<YYYY>/<MM>/<uuid>.<ext>
    ce/etsy/bulk_assets/users/<user_id>/<YYYY>/<MM>/<uuid>.<ext>
    ce/automation/jobs/<job_id>/tasks/<task_id>/original.<ext>
    ce/automation/jobs/<job_id>/tasks/<task_id>/<hr_* oder andere Dateien>
    ce/automation/jobs/<job_id>/tasks/<task_id>/mockups/<datei>.png
    ce/automation/jobs/<job_id>/results/<zip-dateiname>

Legacy (ohne ``ce/``) können noch in URLs/DB vorkommen; Import-Validierung
akzeptiert alte und neue Vorlagen-Pfade unter ``…/template_backgrounds/``.
"""

from __future__ import annotations

CE_BUCKET_PREFIX = "ce"

# Erste Pfadsegmente (ohne trailing slash)
P_CORE_TEMPLATE_BACKGROUNDS = f"{CE_BUCKET_PREFIX}/core/template_backgrounds"
P_GELATO_TEMP_DESIGNS = f"{CE_BUCKET_PREFIX}/gelato/temp_designs"
P_GELATO_ARTWORKS = f"{CE_BUCKET_PREFIX}/gelato/artworks"
P_GELATO_PRODUCT_EXPORTS = f"{CE_BUCKET_PREFIX}/gelato/product_exports"
P_ETSY_BULK_ASSETS = f"{CE_BUCKET_PREFIX}/etsy/bulk_assets"
P_AUTOMATION = f"{CE_BUCKET_PREFIX}/automation"
