# Performance-Analyse — Mockup Generator

> **Zielgruppe:** KI-Agent (Claude, Cursor, Copilot). Jedes Finding ist self-contained mit Datei, Zeilen, aktuellem Code, Fix-Code und Wirkungs-Schätzung.
>
> **Analyse-Datum:** 2026-04-21
> **Branch:** `claude/stoic-haslett-4ef4d3`
> **Ziel-Metriken:**
> - ⬇ API-Response-Zeit um 70-95% (30-120s → 1-3s für Long-Jobs)
> - ⬇ Initial-Bundle um 40-60% (Lazy-Routes)
> - ⬇ UI-Input-Lag < 16ms (60fps bei Drag/Scroll)
> - ⬇ Time-to-Interactive (TTI) um 30-50%
>
> **WICHTIG FÜR DEN AGENT:**
> - Jedes Finding hat eine eindeutige ID (`P-XXX`).
> - Wirkung: **GROSS** = >1s Verbesserung / spürbar. **MITTEL** = 100-500ms. **KLEIN** = <100ms, aber kumulativ.
> - Aufwand: **S** = <1h. **M** = 1-4h. **L** = >4h (Celery-Refactor, React-Query-Einführung, etc.).
> - Zeilennummern vor Edit mit `Read` verifizieren.

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Priority-Matrix](#2-priority-matrix)
3. [Backend — API-Performance](#3-backend--api-performance)
4. [Frontend — UI-Performance](#4-frontend--ui-performance)
5. [Bundle-Size & Code-Splitting](#5-bundle-size--code-splitting)
6. [Caching-Strategie](#6-caching-strategie)
7. [Datenbank-Optimierung](#7-datenbank-optimierung)
8. [Netzwerk & HTTP](#8-netzwerk--http)
9. [Weitere Performance-Themen](#9-weitere-performance-themen)
10. [Monitoring & Benchmarks](#10-monitoring--benchmarks)
11. [Umsetzungs-Roadmap](#11-umsetzungs-roadmap)

---

## 1. Executive Summary

### Größte Flaschenhälse (sortiert nach Wirkung)

| # | Problem | Ist-Wert | Soll-Wert | Wirkung |
|---|---------|----------|-----------|---------|
| 1 | Gemini-API synchron im Request-Thread ([P-001](#p-001)) | 30-120s | 1-3s (Polling) | 🔴 GROSS |
| 2 | Gelato-Export blockiert Worker ([P-002](#p-002)) | 50-200s | <1s | 🔴 GROSS |
| 3 | ZIP-Creation in Request-Handler ([P-003](#p-003)) | 30-120s | <1s | 🔴 GROSS |
| 4 | Pillow-Optimize synchron (200 MB PNG) ([P-004](#p-004)) | 10-25s | Background | 🔴 GROSS |
| 5 | Keine Lazy-Routes, ein großes Bundle ([P-050](#p-050)) | ~500 KB initial | ~150 KB | 🔴 GROSS |
| 6 | Kein Request-Cache/Dedup im Frontend ([P-040](#p-040)) | N duplicate Calls | 1 Call + Cache | 🟠 MITTEL-GROSS |
| 7 | Etsy-Listings: 25 sequentielle Image-Calls ([P-005](#p-005)) | 15-30s | 2-3s | 🟠 MITTEL |
| 8 | Keine DB-Pagination auf List-Views ([P-020](#p-020)) | 100 MB Payload möglich | ~500 KB | 🟠 MITTEL |
| 9 | Kein CanvasViewport-Memoization ([P-060](#p-060)) | Re-Render bei Mouse-Move | Stabil | 🟠 MITTEL |
| 10 | Keine Artwork-Virtualisierung ([P-061](#p-061)) | 100+ DOM-Nodes | Sichtbar ~10 | 🟠 MITTEL |

### Was gut ist ✅

- Zustand-Store mit Selector-Pattern wird bereits genutzt (nicht perfekt, aber solide Basis)
- `prefetch_related("templates__element_rows")` in [core/views.py:92](backend/core/views.py)
- AbortController für Preview-Generation in [GeneratorView.tsx:158](frontend/frontend/src/components/GeneratorView.tsx)
- `loading="lazy"` + `decoding="async"` auf Artwork-Thumbnails
- Proactive JWT-Refresh (nur 1 Flight-Call)
- Celery bereits konfiguriert (`celery[redis]` in requirements.txt) — Foundation da
- Gelato-Bulk-Export bereits via Celery (teilweise)
- React 19 + Vite 8 (aktuellste Versionen)

---

## 2. Priority-Matrix

```
Wirkung GROSS │  P-001 P-002 P-003 P-004  │  P-050 P-040
              │  ↑ Async-Backend-Refactor │  ↑ Frontend-Splitting
──────────────┼───────────────────────────┼────────────────────
Wirkung MITTEL│  P-005 P-020 P-030 P-031  │  P-060 P-061 P-062
              │  ↑ Query & List-Optim.    │  ↑ Render & Virtualisierung
──────────────┼───────────────────────────┼────────────────────
Wirkung KLEIN │  P-021 P-022 P-070        │  P-071 P-072 P-080
              │  ↑ Micro-Optimierungen    │  ↑ UX-Polish
              │                           │
              └ Aufwand S (<1h)           └ Aufwand M-L
```

**Empfehlung:** Mit Spalte 1 (Async-Refactor) beginnen — größte Wirkung auf User-Experience.

---

## 3. Backend — API-Performance

### P-001 — Gemini-API blockiert Request-Thread

**Wirkung:** 🔴 GROSS (30-120s → 1-3s) · **Aufwand:** M (Celery-Task + Polling-Endpoint)

**Datei:** [backend/ai_integration/views.py](backend/ai_integration/views.py) (`GenerateListingDataView.post`, ab ~Zeile 180)

**Aktueller Code (sinngemäß):**
```python
class GenerateListingDataView(APIView):
    def post(self, request):
        # ... validation ...
        manager = AIManager(conn.provider, conn.get_api_key(), conn.model_name)
        result = manager.generate(
            image_file=image,
            context_text=context_text,
            target_type=target_type,
            style_reference=style_reference,
            use_grounding=use_grounding,
        )  # ← blockiert 30-120s im Gunicorn-Worker
        return Response(result)
```

**Problem:**
- Gunicorn-Worker hängt 30-120s → bei 3 Workers = 3 Concurrent-AI-Calls max möglich
- Reverse-Proxy-Timeouts (Render default 100s, Nginx meist 60s)
- User glaubt bei 60s+ die App sei abgestürzt → Reload → Duplicate-Job

**Fix:**

1. Neue Datei `backend/ai_integration/tasks.py`:
```python
from celery import shared_task
from django.core.files.base import ContentFile
import base64

from .manager import AIManager
from .models import AIConnection, AIJob  # AIJob wäre ein neues Model

@shared_task(bind=True, max_retries=2, soft_time_limit=180, time_limit=300)
def generate_listing_async(self, job_id: str):
    job = AIJob.objects.select_related("user", "connection").get(id=job_id)
    job.status = AIJob.Status.PROCESSING
    job.save(update_fields=["status", "updated_at"])
    try:
        manager = AIManager(
            job.connection.provider,
            job.connection.get_api_key(),
            job.connection.model_name,
        )
        image_bytes = base64.b64decode(job.payload["image_b64"])
        result = manager.generate(
            image_file=ContentFile(image_bytes, name="input.png"),
            context_text=job.payload.get("context", ""),
            target_type=job.payload.get("target", "all"),
            style_reference=job.payload.get("style_reference", ""),
            use_grounding=job.payload.get("use_grounding", False),
        )
        job.result = result
        job.status = AIJob.Status.DONE
        job.save(update_fields=["result", "status", "updated_at"])
    except Exception as exc:
        job.status = AIJob.Status.FAILED
        job.error = str(exc)[:1000]
        job.save(update_fields=["status", "error", "updated_at"])
        raise
```

2. View umschreiben:
```python
class GenerateListingDataView(APIView):
    throttle_scope = "ai_generate"  # siehe F-006 aus Security-Doc

    def post(self, request):
        # ... validation ...
        image_b64 = base64.b64encode(image.read()).decode()
        job = AIJob.objects.create(
            user=request.user,
            connection=conn,
            payload={
                "image_b64": image_b64,
                "context": context_text,
                "target": target_type,
                "style_reference": style_reference,
                "use_grounding": use_grounding,
            },
            status=AIJob.Status.PENDING,
        )
        generate_listing_async.delay(str(job.id))
        return Response(
            {"job_id": str(job.id), "status": "pending"},
            status=status.HTTP_202_ACCEPTED,
        )


class GenerateListingStatusView(APIView):
    def get(self, request, job_id):
        job = AIJob.objects.filter(id=job_id, user=request.user).only(
            "status", "result", "error", "updated_at"
        ).first()
        if not job:
            return Response(status=404)
        return Response({
            "status": job.status,
            "result": job.result if job.status == AIJob.Status.DONE else None,
            "error": job.error if job.status == AIJob.Status.FAILED else None,
        })
```

3. Frontend pollt alle 2s `/api/ai/status/{job_id}/` — siehe [P-041](#p-041).

**Akzeptanzkriterium:**
- `POST /api/ai/generate-listing/` liefert in <500ms `202 Accepted` mit `job_id`.
- Worker verarbeitet Job im Hintergrund; kein Gunicorn-Timeout mehr.

---

### P-002 — Gelato-Export: Pillow + R2-Upload blockieren POST

**Wirkung:** 🔴 GROSS (50-200s für 5 Artworks → <1s) · **Aufwand:** M

**Datei:** [backend/gelato_integration/views.py](backend/gelato_integration/views.py) (`GelatoExportView.post`, Zeilen ~369-413)

**Aktueller Code (sinngemäß):**
```python
for idx, art_file in enumerate(artworks):
    # ...
    artwork_url = _upload_to_r2(art_file, "gelato_artworks")  # Sync: optimize + upload
    task = GelatoExportTask.objects.create(..., artwork_r2_url=artwork_url)
    tasks_created.append(task)

# Fallback-Schleife die Celery synchron ausführt wenn Broker down ist:
try:
    process_gelato_bulk_export.delay(task_ids)
except Exception:
    process_gelato_bulk_export(task_ids)  # ← SYNC-FALLBACK blockiert komplett
```

**Problem:** Selbst wenn Celery läuft, werden `_optimize_image()` (Pillow) + R2-PUT pro Datei im Request-Thread ausgeführt. Bei 5×100MB → 60-150s Response-Zeit.

**Fix:**

```python
class GelatoExportView(APIView):
    throttle_scope = "upload"

    def post(self, request):
        # ... validation ...
        tasks_created = []
        for idx, art_file in enumerate(artworks):
            meta = metadata_list[idx] if idx < len(metadata_list) else {}
            # Datei lokal/temp-speichern — Optimize + R2-Upload im Worker
            task = GelatoExportTask.objects.create(
                user=request.user,
                gelato_template=tpl,
                design_image=art_file,  # FileField speichert lokal
                title=str(meta.get("title", art_file.name))[:512],
                description=str(meta.get("description", "")),
                tags=str(meta.get("tags", ""))[:1024],
                free_shipping=free_shipping,
                status=GelatoExportTask.Status.PENDING,
            )
            tasks_created.append(task)

        process_gelato_bulk_export.delay([str(t.id) for t in tasks_created])
        # KEIN sync-fallback! Wenn Celery down → 503.
        return Response(
            GelatoExportTaskSerializer(tasks_created, many=True).data,
            status=status.HTTP_202_ACCEPTED,
        )
```

Im Worker (`tasks.py`):
```python
@shared_task(bind=True, max_retries=3, soft_time_limit=600)
def process_gelato_bulk_export(self, task_ids: list[str]):
    for tid in task_ids:
        task = GelatoExportTask.objects.filter(id=tid).select_related("gelato_template").first()
        if not task:
            continue
        try:
            task.status = GelatoExportTask.Status.PROCESSING
            task.save(update_fields=["status", "updated_at"])
            # Pillow + R2 HIER
            task.artwork_r2_url = _upload_to_r2(task.design_image, "gelato_artworks")
            task.save(update_fields=["artwork_r2_url"])
            # ... Gelato API-Call ...
        except Exception as exc:
            task.status = GelatoExportTask.Status.FAILED
            task.error_message = str(exc)[:2000]
            task.save(update_fields=["status", "error_message"])
```

**Akzeptanzkriterium:** `POST /api/gelato/export/` liefert <1s mit allen Tasks in `PENDING`.

---

### P-003 — Automation-ZIP-Creation synchron

**Wirkung:** 🔴 GROSS (30-120s) · **Aufwand:** M

**Datei:** [backend/automation/views.py](backend/automation/views.py) + [backend/automation/pipeline.py:67-95](backend/automation/pipeline.py)

**Aktueller Code (sinngemäß):**
```python
for tid in task_ids:
    process_single_image(str(tid))  # blockiert im Request
finalize_job(str(job.id))  # ZIP von 35 Bildern ~30-120s
```

**Fix:** Analog zu P-002 — Job sofort erstellen, Async verarbeiten, Status-Endpoint zum Pollen.

```python
@shared_task(bind=True, time_limit=1800, soft_time_limit=1500)
def process_automation_job_async(self, job_id: str):
    from automation.pipeline import process_single_image, finalize_job
    job = AutomationJob.objects.prefetch_related("tasks").get(id=job_id)
    for t in job.tasks.all():
        process_single_image(str(t.id))
    finalize_job(str(job.id))
```

View:
```python
class AutomationJobCreateView(APIView):
    def post(self, request):
        job = AutomationJob.objects.create(user=request.user, status=AutomationJob.Status.PROCESSING)
        for f in images:
            ImageTask.objects.create(job=job, original_image=f)
        process_automation_job_async.delay(str(job.id))
        return Response(
            AutomationJobSerializer(job, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )
```

**Akzeptanzkriterium:** Beim Auslösen eines Automation-Jobs kommt Response in <1s, UI pollt Fortschritt.

---

### P-004 — Pillow-Optimize lädt 200 MB PNG in RAM

**Wirkung:** 🔴 GROSS (10-25s pro Datei + OOM-Risiko) · **Aufwand:** M

**Datei:** [backend/gelato_integration/views.py](backend/gelato_integration/views.py) (`_optimize_image`, Zeilen ~54-97)

**Problem:**
- `PILImage.open(file)` + `img.save(buf)` hält komplettes 200-MB-Bild im RAM → auf render-Starter (512 MB) → OOM bei 2 parallelen Uploads.
- Chunked/Streaming nicht möglich mit Pillow.

**Fix (mehrstufig):**

1. Harte Upload-Grenze auf 50 MB (siehe Security-Doc F-007): löst das Grundproblem.
2. Im Celery-Worker wegen (1) weniger RAM nötig; Worker dediziert auf Image-Queue:
```python
# settings.py
CELERY_TASK_ROUTES = {
    "gelato_integration.tasks.process_gelato_bulk_export": {"queue": "images"},
    "automation.tasks.process_automation_job_async": {"queue": "images"},
    "ai_integration.tasks.generate_listing_async": {"queue": "ai"},
}
```
3. Optional `img.thumbnail((max_w, max_h))` statt `save`, um in-place zu resizen.
4. `Pillow-SIMD` (optional, fork mit 4-6× schnellerem resize):
   ```
   # requirements-prod.txt
   # pip uninstall Pillow
   Pillow-SIMD>=9.5
   ```

**Akzeptanzkriterium:** Kein OOM bei 3 parallelen 50-MB-Uploads; `docker stats` zeigt <400 MB pro Worker.

---

### P-005 — Etsy-Listings: N+1 API-Calls (Bild-Sub-Requests)

**Wirkung:** 🟠 MITTEL (15-30s → 2-3s) · **Aufwand:** M

**Datei:** [backend/etsy/views.py](backend/etsy/views.py) (`EtsyListingsView.get`, Zeilen ~218-232)

**Aktueller Code:**
```python
for listing in results:  # 25 Listings
    lid = get_listing_id(listing)
    imgs = client2.get_json(
        f"/shops/{conn.shop_id}/listings/{lid}/images",
    )
    listing["images"] = imgs
```

**Fix — Option A (ideal):** Etsy hat `includes=Images` Query-Parameter. Einen API-Call statt 1+N:
```python
listings_data = client.get_json(
    f"/shops/{conn.shop_id}/listings/active",
    params={"limit": limit, "offset": offset, "includes": "Images"},
)
# listings_data[i].images bereits enthalten → kein Sub-Call
```

**Fix — Option B:** Parallel via `httpx.AsyncClient`:
```python
import asyncio
import httpx

async def _fetch_images_concurrent(shop_id, listing_ids, token):
    async with httpx.AsyncClient(timeout=10) as ac:
        tasks = [
            ac.get(
                f"https://openapi.etsy.com/v3/application/shops/{shop_id}/listings/{lid}/images",
                headers={"Authorization": f"Bearer {token}"},
            )
            for lid in listing_ids
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)

# In View (Django unterstützt async views):
images_results = asyncio.run(_fetch_images_concurrent(conn.shop_id, [get_listing_id(l) for l in results], access_token))
```

**Fix — Option C (pragmatisch):** Cachen + lazy im Frontend nachladen (siehe P-031).

**Akzeptanzkriterium:** `GET /api/etsy/listings/` liefert in <3s statt 15-30s.

---

### P-020 — Keine DRF-Pagination auf List-Views

**Wirkung:** 🟠 MITTEL (bei vielen Templates) · **Aufwand:** S

**Datei:** [backend/config/settings.py:202-207](backend/config/settings.py:202)

**Aktueller Code:**
```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (...),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}
```

**Fix:**
```python
REST_FRAMEWORK = {
    # ... bestehend ...
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 25,
}
```

Für TemplateSetViewSet empfiehlt sich zusätzlich ein „Light-Mode" ohne nested `elements` (siehe P-022).

**Akzeptanzkriterium:** `GET /api/template-sets/` liefert 25 Items mit `next`/`previous`-Links.

---

### P-021 — Fehlende DB-Indizes auf Query-Feldern

**Wirkung:** 🟡 KLEIN-MITTEL · **Aufwand:** S

**Dateien:**
- [backend/gelato_integration/models.py](backend/gelato_integration/models.py) — `GelatoTemplate.gelato_template_id`, `GelatoConnection.store_id`
- [backend/etsy/models.py](backend/etsy/models.py) — `EtsyConnection.shop_id`
- [backend/etsy/models.py](backend/etsy/models.py) — `EtsyOAuthState.state` (wird bei jedem Callback gequeryt)

**Fix:**
```python
class GelatoTemplate(models.Model):
    gelato_template_id = models.CharField(max_length=255, db_index=True)  # + db_index

class GelatoConnection(models.Model):
    store_id = models.CharField(max_length=128, blank=True, db_index=True)

class EtsyConnection(models.Model):
    shop_id = models.BigIntegerField(null=True, blank=True, db_index=True)

class EtsyOAuthState(models.Model):
    state = models.CharField(max_length=255, unique=True)  # unique=True impliziert Index
```

Oder via `Meta.indexes`:
```python
class Meta:
    indexes = [
        models.Index(fields=["user", "-created_at"]),  # für List-Views mit order_by
    ]
```

Nach Änderung: `python manage.py makemigrations && python manage.py migrate`.

**Akzeptanzkriterium:** `EXPLAIN ANALYZE` auf typischer Query nutzt Index-Scan statt Seq-Scan.

---

### P-022 — TemplateSet-Serializer lädt alle Elements nested

**Wirkung:** 🟠 MITTEL (Large Payload) · **Aufwand:** S

**Datei:** [backend/core/serializers.py:89-100](backend/core/serializers.py:89)

**Aktueller Code:**
```python
def get_elements(self, obj: Template) -> list[dict[str, Any]]:
    rows = obj.element_rows.all().order_by("order", "id")
    return [TemplateElementSerializer(r, context=self.context).data for r in rows]

class TemplateSetSerializer(serializers.ModelSerializer):
    templates = TemplateSerializer(many=True, read_only=True)
```

**Problem:** `.order_by("order", "id")` nach `prefetch_related` im ViewSet **invalidiert den Prefetch-Cache** → N+1. Zusätzlich werden bei jedem List-Aufruf alle Elements jedes Templates serialisiert.

**Fix (zwei Teile):**

1. Order im `Meta.ordering` oder im `Prefetch`-Objekt:
```python
# core/views.py
from django.db.models import Prefetch

class TemplateSetViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return TemplateSet.objects.filter(user=self.request.user).prefetch_related(
            Prefetch(
                "templates__element_rows",
                queryset=TemplateElement.objects.order_by("order", "id"),
            )
        )
```

2. Im Serializer ohne erneutes `order_by`:
```python
def get_elements(self, obj: Template) -> list[dict[str, Any]]:
    # Nutzt Prefetch-Cache — kein neuer Query
    return [TemplateElementSerializer(r, context=self.context).data for r in obj.element_rows.all()]
```

3. Split in „List" vs „Detail":
```python
class TemplateSetListSerializer(serializers.ModelSerializer):
    template_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = TemplateSet
        fields = ("id", "name", "template_count", "created_at", "updated_at")

class TemplateSetViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action == "list":
            return TemplateSetListSerializer
        return TemplateSetSerializer

    def get_queryset(self):
        from django.db.models import Count
        qs = TemplateSet.objects.filter(user=self.request.user)
        if self.action == "list":
            return qs.annotate(template_count=Count("templates"))
        return qs.prefetch_related(...)
```

**Akzeptanzkriterium:** `GET /api/template-sets/` liefert Liste ohne nested Elements (evtl. nur `template_count`); Details nur bei `/api/template-sets/{id}/`.

---

### P-030 — R2TempCleanupMiddleware bei jedem API-Call

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

**Datei:** [backend/gelato_integration/middleware.py:18-20](backend/gelato_integration/middleware.py:18)

**Aktueller Code:**
```python
def __call__(self, request: HttpRequest) -> HttpResponse:
    if request.path.startswith("/api/"):
        cleanup_expired_r2_temp_uploads()
    return self.get_response(request)
```

**Problem:** Cooldown ist bereits drin, aber Function-Call + `time.monotonic()`-Check pro Request sind unnötig, wenn Celery-Beat läuft. Außerdem: `cleanup_expired_r2_temp_uploads()` kann bei Cooldown-Ablauf 1000 R2-DELETEs auslösen und schneidet die Request-Latenz des ausgewählten Users an.

**Fix:** Middleware entfernen, stattdessen Celery-Beat-Schedule:
```python
# backend/config/celery.py (neu)
from celery.schedules import crontab
app.conf.beat_schedule = {
    "r2-temp-cleanup": {
        "task": "gelato_integration.tasks.cleanup_r2_temp_async",
        "schedule": crontab(minute=0, hour="*/6"),  # alle 6h
    },
}
```

`cleanup_expired_r2_temp_uploads` in einen Celery-Task packen, Middleware entfernen. Falls Celery nicht aktiv ist (Dev): `python manage.py cleanup_r2_temp_designs` manuell.

**Akzeptanzkriterium:** `/api/`-Requests haben keinen Cleanup-Overhead mehr (dev-tools Network-Tab).

---

### P-031 — Kein Caching für Etsy/Gelato/Gemini-Responses

**Wirkung:** 🟠 MITTEL (bei wiederholten Queries bis zu 100×) · **Aufwand:** S-M

**Datei:** [backend/config/settings.py](backend/config/settings.py) (kein CACHES-Dict vorhanden)

**Fix — Redis-Cache einrichten:**
```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",  # Django 4.0+ built-in
        "LOCATION": os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/2"),
        "TIMEOUT": 300,
    }
}
```

**Use-Cases:**

1. Etsy-Listings für 60s cachen:
```python
from django.core.cache import cache

class EtsyListingsView(APIView):
    def get(self, request):
        cache_key = f"etsy:listings:{request.user.id}:{offset}:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        data = # ... fetch ...
        cache.set(cache_key, data, 60)
        return Response(data)
```

2. Gelato-Templates (Store-Katalog ändert sich selten) 1h cachen.

3. Gemini-Responses NICHT cachen (selten identisches Prompt + Bild, DSGVO-kritisch).

**Akzeptanzkriterium:** 2. Aufruf von `/api/etsy/listings/?offset=0` in <50ms (Cache-Hit).

---

### P-032 — AI-Connection `get_or_create` in Hot-Path

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

**Datei:** [backend/ai_integration/views.py](backend/ai_integration/views.py) (~Zeile 82)

**Aktueller Code:**
```python
conn, _ = AIConnection.objects.get_or_create(user=request.user)
```

**Problem:** Race-Condition bei Parallel-Requests → gelegentliche `IntegrityError` auf `OneToOneField`.

**Fix:**
```python
from django.db import transaction

with transaction.atomic():
    conn, _ = AIConnection.objects.select_for_update().get_or_create(user=request.user)
```

Oder besser: `AIConnection` als Signal beim `User.create()` anlegen (post_save), so dass `get_or_create` nie nötig ist:
```python
# ai_integration/signals.py
from django.db.models.signals import post_save
from django.contrib.auth import get_user_model
from django.dispatch import receiver
from .models import AIConnection

@receiver(post_save, sender=get_user_model())
def create_ai_connection(sender, instance, created, **kwargs):
    if created:
        AIConnection.objects.get_or_create(user=instance)
```

**Akzeptanzkriterium:** Load-Test mit 50 parallelen `/api/ai/connect/` zeigt 0 IntegrityErrors.

---

### P-033 — Gunicorn-Worker-Konfiguration

**Wirkung:** 🟡 KLEIN-MITTEL (je nach Traffic) · **Aufwand:** S

Auf render.com-Starter (0.5 vCPU, 512 MB):
- 3 Worker ist zuviel → Memory-Druck.
- Besser: **2 Worker + 4 Threads** (I/O-bound wegen Gemini/Etsy-Calls).

**Fix in [bin/render-start.sh](bin/render-start.sh):**
```bash
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers ${WEB_CONCURRENCY:-2} \
  --threads ${WEB_THREADS:-4} \
  --worker-class gthread \
  --max-requests 1000 --max-requests-jitter 100 \
  --timeout 60 \
  --keep-alive 5 \
  --access-logfile - --error-logfile -
```

`--max-requests`: Worker nach 1000 Requests neustarten — defensiv gegen Memory-Leaks (z.B. durch Pillow).

**Akzeptanzkriterium:** `ps -o rss` zeigt stabile Worker-Speichernutzung über 1000+ Requests.

---

## 4. Frontend — UI-Performance

### P-040 — Kein Request-Cache / Keine Deduplication

**Wirkung:** 🟠 MITTEL-GROSS · **Aufwand:** L (einmalige React-Query-Einführung, danach S pro Endpoint)

**Problem:** Viele Komponenten callen parallel oder bei jedem Mount:
- `gelatoStatus()`, `gelatoListTemplates()` in `GeneratorView.tsx:127-137`
- Etsy-Listings bei jedem Tab-Wechsel
- Template-Sets bei jedem Editor-Open

→ Doppelte/Dreifache HTTP-Calls, kein Background-Revalidation.

**Fix:** `@tanstack/react-query` einführen:
```bash
npm install @tanstack/react-query
```

```tsx
// src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

```tsx
// main.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

Verwendung ersetzt `useEffect(() => { fetch(...) }, [])`:
```tsx
// GeneratorView.tsx — statt useEffect+useState
import { useQuery } from "@tanstack/react-query";

const { data: gelatoConn } = useQuery({
  queryKey: ["gelato", "status"],
  queryFn: gelatoStatus,
  staleTime: 60_000,
});

const { data: gelatoTemplates } = useQuery({
  queryKey: ["gelato", "templates"],
  queryFn: gelatoListTemplates,
  enabled: gelatoConn?.connected === true,
  staleTime: 5 * 60_000,
});
```

**Bonus:** React-Query macht automatisch Request-Dedup (1 Call pro Key) und Background-Refetch.

**Akzeptanzkriterium:** Network-Tab zeigt bei Tab-Wechseln keinen Duplicate-Call für unveränderte Keys.

---

### P-041 — Polling für Long-Running Jobs statt HTTP-Hang

**Wirkung:** 🔴 GROSS (kombiniert mit P-001/P-002) · **Aufwand:** S

**Voraussetzung:** P-001/P-002 umgesetzt (Async-Endpoints geben `job_id` zurück).

**Fix (mit React-Query):**
```tsx
// src/hooks/useAIJob.ts
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";

type JobState = {
  status: "pending" | "processing" | "done" | "failed";
  result?: unknown;
  error?: string;
};

export const useAIJob = (jobId: string | null) =>
  useQuery<JobState>({
    queryKey: ["ai-job", jobId],
    queryFn: () => apiJson(`/api/ai/status/${jobId}/`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      return data.status === "done" || data.status === "failed" ? false : 2000;
    },
  });
```

Komponente:
```tsx
const [jobId, setJobId] = useState<string | null>(null);
const { data: job } = useAIJob(jobId);

const generate = async () => {
  const res = await aiStartGeneration({ /* ... */ });
  setJobId(res.job_id);  // triggert Polling
};

// Optional: Toast bei Fertig
useEffect(() => {
  if (job?.status === "done") toast.success("AI fertig!");
}, [job?.status]);
```

**Verbesserung:** Bei längeren Jobs (> 30s) auf **Server-Sent-Events (SSE)** upgraden → sofortige Benachrichtigung statt 2s-Polling.

**Akzeptanzkriterium:** UI zeigt Progress ab Job-Start innerhalb 2s, kein „HTTP 504 Gateway Timeout" mehr.

---

### P-042 — `credentials`/`AbortController` fehlen bei langen Requests

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

**Datei:** [frontend/frontend/src/api/client.ts](frontend/frontend/src/api/client.ts)

`AbortController` nur in Preview-Pipeline. Langer `GET /api/etsy/listings/` kann bei Navigation nicht abgebrochen werden → Bandwidth-Verschwendung.

**Fix:** React-Query macht das automatisch, wenn Component unmountet und Query abgebrochen wird. Bei vanilla-Fetch:
```tsx
export const apiFetch = async (
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {}
): Promise<Response> => {
  const res = await apiFetchOnce(path, init);
  // ... bestehende Logik
};

// In Component:
useEffect(() => {
  const ac = new AbortController();
  void apiFetch("/api/etsy/listings/", { signal: ac.signal });
  return () => ac.abort();
}, []);
```

---

### P-050 — Keine Lazy-Routes / Code-Splitting

**Wirkung:** 🔴 GROSS (Initial-Bundle 40-60% kleiner) · **Aufwand:** S

**Datei:** [frontend/frontend/src/main.tsx:1-11](frontend/frontend/src/main.tsx:1), [App.tsx](frontend/frontend/src/App.tsx)

**Problem:** Alle Top-Level-Routes + alle Tab-Views (`GeneratorView`, `TemplatesStudio`, `IntegrationsView`, `RoadmapView`, `AccountPage`) sind statisch importiert → ein großes Bundle.

**Fix:**

1. `main.tsx`:
```tsx
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const App = lazy(() => import("./App"));
const AuthScreen = lazy(() => import("./components/AuthScreen").then(m => ({ default: m.AuthScreen })));
const EtsyCallbackPage = lazy(() => import("./pages/EtsyCallbackPage").then(m => ({ default: m.EtsyCallbackPage })));
const PinterestCallbackPage = lazy(() => import("./pages/PinterestCallbackPage").then(m => ({ default: m.PinterestCallbackPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
import { Toaster } from "./components/ui/Toaster";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Lädt…</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/etsy/callback" element={<EtsyCallbackPage />} />
          <Route path="/pinterest/callback" element={<PinterestCallbackPage />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
```

2. `App.tsx`:
```tsx
import { lazy, Suspense } from "react";

const GeneratorView = lazy(() => import("./components/GeneratorView").then(m => ({ default: m.GeneratorView })));
const TemplatesStudio = lazy(() => import("./components/TemplatesStudio").then(m => ({ default: m.TemplatesStudio })));
const IntegrationsView = lazy(() => import("./components/IntegrationsView").then(m => ({ default: m.IntegrationsView })));
const RoadmapView = lazy(() => import("./components/RoadmapView").then(m => ({ default: m.RoadmapView })));
const AccountPage = lazy(() => import("./components/AccountPage").then(m => ({ default: m.AccountPage })));

// ... im Render
<Suspense fallback={<TabLoadingSkeleton />}>
  <ActiveView />
</Suspense>
```

3. Vite-Manual-Chunks (optional) in `vite.config.ts`:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        "vendor-react": ["react", "react-dom", "react-router-dom"],
        "vendor-framer": ["framer-motion"],
        "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        "vendor-jszip": ["jszip"],
        "vendor-ui": ["cmdk", "sonner", "@radix-ui/react-dialog", "@radix-ui/react-switch", "@radix-ui/react-tooltip"],
      },
    },
  },
},
```

**Akzeptanzkriterium:**
- `dist/assets/` hat mindestens 5 Chunks.
- Initial-Request lädt ~150-200 KB gzipped (statt ~500-700 KB).
- `npm run build` Log zeigt getrennte Chunks.

---

### P-051 — Vite-Build-Flags für Production

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

**Datei:** [frontend/frontend/vite.config.ts](frontend/frontend/vite.config.ts)

**Fix:**
```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    cssCodeSplit: true,
    minify: "esbuild",
    sourcemap: false,
    reportCompressedSize: false,  // schneller CI-Build
    chunkSizeWarningLimit: 600,
  },
  // ... bestehend
});
```

---

### P-060 — CanvasViewport re-rendert bei jeder Mouse-Bewegung

**Wirkung:** 🟠 MITTEL (spürbar als Input-Lag beim Dragging) · **Aufwand:** M

**Datei:** [frontend/frontend/src/components/editor/CanvasViewport.tsx](frontend/frontend/src/components/editor/CanvasViewport.tsx)

**Problem:** `setCursorPoint(point)` bei jedem `mousemove` → Re-Render von CanvasViewport + allen Children. Bei 60 Hz Mouse = 60 Re-Renders/s.

**Fix (drei Techniken kombiniert):**

1. **`React.memo`** auf CanvasViewport:
```tsx
export const CanvasViewport = memo(function CanvasViewport(props: Props) {
  // ...
});
```

2. **Cursor in `ref`** statt State speichern, nur für Rendering den Canvas direkt manipulieren:
```tsx
const cursorRef = useRef<{x: number; y: number}>({ x: 0, y: 0 });
const indicatorRef = useRef<HTMLDivElement>(null);

const handleMove = useCallback((e: React.PointerEvent) => {
  cursorRef.current = { x: e.clientX, y: e.clientY };
  if (indicatorRef.current) {
    indicatorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }
}, []);
```

3. **`useCallback`** für alle Event-Handler die als Props weitergegeben werden.

4. **RAF-Throttling** bei teuren Updates:
```tsx
const rafRef = useRef<number>(0);
const handleMove = useCallback((e: React.PointerEvent) => {
  if (rafRef.current) return;
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = 0;
    setCursorPoint({ x: e.clientX, y: e.clientY });
  });
}, []);
```

**Akzeptanzkriterium:** Chrome DevTools > Performance Profiler zeigt <5 ms „Scripting" pro Frame beim Dragging.

---

### P-061 — Keine Virtualisierung bei langen Listen

**Wirkung:** 🟠 MITTEL (bei 50+ Items) · **Aufwand:** M

**Betroffen:**
- `GelatoExportModal` — Artwork-Liste (bis 100+ Items)
- `EtsyListingsEditor` — Listings-Liste (bis 100+)
- `AIActivityPanel` — Log-Einträge (80 Max in aiActivityStore)

**Fix:** `@tanstack/react-virtual` einbauen (leichter als react-window):
```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function ArtworkList({ items }: { items: Artwork[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 6,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={vi.key}
            style={{
              position: "absolute",
              top: 0, left: 0, width: "100%",
              height: vi.size,
              transform: `translateY(${vi.start}px)`,
            }}
          >
            <ArtworkListThumbnail artwork={items[vi.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Akzeptanzkriterium:** DOM enthält bei 200 Artworks max ~15 `<ArtworkListThumbnail>` (sichtbar + Overscan).

---

### P-062 — Framer-Motion `layout` auf Listen-Items

**Wirkung:** 🟠 MITTEL (spürbares Ruckeln beim Löschen) · **Aufwand:** S

**Datei:** [frontend/frontend/src/components/editor/LayerManager.tsx:34-51](frontend/frontend/src/components/editor/LayerManager.tsx:34)

**Aktueller Code:**
```tsx
<motion.div
  key={el.id}
  layout
  initial={{ opacity: 0, y: 2 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{
    opacity: 0, height: 0,
    marginTop: 0, marginBottom: 0,
    paddingTop: 0, paddingBottom: 0,
  }}
  transition={{ duration: 0.2, layout: { duration: 0.2, ease: "easeOut" } }}
>
```

**Problem:** `layout` zwingt Layout-Recalc aller Siblings. `height: 0` + Padding-Animations = Layout-Thrashing.

**Fix:** GPU-beschleunigte Transforms nutzen:
```tsx
<motion.div
  key={el.id}
  layout="position"  // nur Position, kein Size
  initial={{ opacity: 0, scale: 0.97 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
  style={{ willChange: "transform, opacity" }}
>
```

**Akzeptanzkriterium:** Chrome Performance-Profiler zeigt <16 ms Frame-Time beim Hinzufügen/Entfernen von 10 Layern.

---

### P-063 — Globale `transition-all` auf allen Buttons

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

**Datei:** [frontend/frontend/src/index.css](frontend/frontend/src/index.css) (Zeilen ~124-130)

**Aktueller Code:**
```css
button, [role="button"], a, select, input {
  @apply transition-all duration-200 ease-in-out;
}
```

**Problem:** `transition-all` animiert jede Property-Änderung (auch Layout-Props wie `height`) → teuer.

**Fix:**
```css
button, [role="button"], a, select, input {
  @apply transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-in-out;
}
```

**Akzeptanzkriterium:** DevTools > Layers-Panel zeigt weniger Composite-Layers bei Hover.

---

### P-064 — Zustand ohne `useShallow` → unnötige Re-Renders

**Wirkung:** 🟡 KLEIN-MITTEL · **Aufwand:** S

**Datei:** [frontend/frontend/src/App.tsx:38-43](frontend/frontend/src/App.tsx:38)

**Aktueller Code (mehrere Einzelselektoren — OK):**
```tsx
const accessToken = useAppStore((s) => s.accessToken);
const logout = useAppStore((s) => s.logout);
const activeTab = useAppStore((s) => s.activeTab);
const setActiveTab = useAppStore((s) => s.setActiveTab);
```

Das ist bereits gut (Zustand subscribt pro Selector). **ABER:** In großen Components die 5+ Selectoren haben, die alle re-rendern wenn **einer** sich ändert, kann `useShallow` helfen:

```tsx
import { useShallow } from "zustand/react/shallow";

const { accessToken, logout, activeTab, setActiveTab, navigationLocked } = useAppStore(
  useShallow((s) => ({
    accessToken: s.accessToken,
    logout: s.logout,
    activeTab: s.activeTab,
    setActiveTab: s.setActiveTab,
    navigationLocked: s.navigationLocked,
  })),
);
```

(Im Praxiseinsatz: nur nötig wenn Profiler zeigt, dass die Component zu oft re-rendert.)

---

### P-070 — `console.log`/`console.error` in Production

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

**Betroffen:** 11 Stellen laut Grep — TemplateEditor, EtsyListingsEditor, GeneratorView u.a.

**Fix (zentral via Vite-Build):**
```ts
// vite.config.ts
export default defineConfig({
  // ...
  esbuild: {
    drop: ["console", "debugger"],  // in Production alle console.* entfernen
  },
});
```

Oder selektiv:
```ts
esbuild: {
  pure: ["console.log", "console.debug"],  // error + warn behalten
}
```

**Akzeptanzkriterium:** `dist/assets/*.js` enthält keinen String `console.log`.

---

### P-071 — Font-Preload für Inter-Variable

**Wirkung:** 🟡 KLEIN (reduziert CLS) · **Aufwand:** S

**Datei:** [frontend/frontend/index.html](frontend/frontend/index.html)

**Aktueller Code:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:..." rel="stylesheet" />
```

**Problem:** Inter wird zusätzlich über `@fontsource-variable/inter` im Bundle geliefert → doppelt geladen.

**Fix — Option A (nur Fontsource, Google Fonts entfernen):**
```html
<!-- index.html: Google Fonts-Link entfernen -->
```

```tsx
// src/main.tsx
import "@fontsource-variable/inter";
```

**Option B (nur Google Fonts, Fontsource entfernen):**
- `@fontsource-variable/inter` aus `package.json` entfernen.
- `font-display: swap` via `&display=swap` ist bereits gesetzt → OK.

**Akzeptanzkriterium:** Network-Tab zeigt 1× Inter-Woff2 statt 2×.

---

### P-072 — Theme-Toggle Drop-Shadow teuer

**Wirkung:** 🟡 KLEIN (nur während Toggle-Animation) · **Aufwand:** S

**Datei:** [frontend/frontend/src/index.css](frontend/frontend/src/index.css) (Zeilen ~166-210)

**Fix:** Double-`drop-shadow` auf Box-Shadow umstellen oder Anzahl der Keyframes reduzieren. Nice-to-have; niedrige Priorität.

---

### P-073 — DevTools/StrictMode in Production

**Wirkung:** 🟡 KLEIN · **Aufwand:** Keine Änderung nötig

`<StrictMode>` in `main.tsx:22` ist **nur in Dev** aktiv (Vite strippt in Prod) — kein Fix nötig.

---

## 5. Bundle-Size & Code-Splitting

### P-080 — Große Dependencies prüfen

**Datei:** [frontend/frontend/package.json](frontend/frontend/package.json)

| Package | Gzipped | Notwendig? | Maßnahme |
|---------|---------|-----------|----------|
| `framer-motion` | ~50 KB | Ja | → eigenen Chunk (P-050) |
| `@dnd-kit/*` | ~30 KB | Ja | → eigenen Chunk |
| `jszip` | ~25 KB | Nur für Client-Download? | Lazy-Load |
| `react-router-dom` | ~15 KB | Ja | vendor-react |
| `@radix-ui/*` | ~20 KB | Nur Dialog/Switch/Tooltip | OK (tree-shaken) |
| `cmdk` | ~10 KB | Ja | OK |
| `lucide-react` | ~5 KB pro Icon | Ja | Tree-shaking funktioniert |
| `sonner` | ~5 KB | Ja | OK |
| `zustand` | ~3 KB | Ja | OK |

**jszip lazy laden** (wird nur für Download-Bundle gebraucht):
```tsx
const handleDownload = async () => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  // ...
};
```

**Akzeptanzkriterium:** `jszip` nicht mehr im Initial-Bundle.

---

### P-081 — Tailwind-Arbitrary-Values Bloat

**Datei:** diverse Components mit `shadow-[0_10px_32px_-6px_rgba(...)]`

**Problem:** Jedes `shadow-[...]` erzeugt eine eigene CSS-Utility-Klasse → Bundle wächst. Bei 50 Arbitrary-Shadows → 50 Zeilen extra CSS.

**Fix:** Theme-Token in `tailwind.config` definieren:
```ts
theme: {
  extend: {
    boxShadow: {
      "brand-glow": "0 10px 32px -6px rgba(15,23,42,0.12), 0 0 24px -4px rgba(99,102,241,0.2)",
      "card-subtle": "0 2px 8px rgb(0,0,0,0.04)",
    },
  },
},
```

Dann `shadow-brand-glow` statt `shadow-[0_10px_32px_-6px_rgba(...)]`.

---

## 6. Caching-Strategie

### Backend (Django)

| Was | TTL | Backend | Priorität |
|-----|-----|---------|-----------|
| Etsy-Listings | 60s | Redis | Hoch |
| Gelato-Templates | 5 min | Redis | Hoch |
| Pinterest-Boards | 5 min | Redis | Mittel |
| User-Settings | 10 min | Redis | Niedrig |
| Gemini-Responses | — | Nicht cachen (PII + selten identisch) | — |
| Static-Files | 1 Jahr | WhiteNoise `max-age=31536000` | Hoch |

### Frontend (React-Query)

| Was | staleTime | gcTime |
|-----|-----------|--------|
| Gelato-Status | 60s | 5 min |
| Gelato-Templates | 5 min | 30 min |
| Etsy-Listings | 30s | 5 min |
| Template-Sets | 2 min | 10 min |
| AI-Job-Status | 0 (polling) | 2 min |

### HTTP-Header

```python
# views.py
from django.views.decorators.cache import cache_control

@method_decorator(cache_control(max_age=60, private=True), name="dispatch")
class SomeReadOnlyView(APIView):
    ...
```

Für `GET /api/media/*` Assets aus R2:
```python
# S3Boto3Storage Config
"object_parameters": {"CacheControl": "public, max-age=31536000, immutable"},
```

---

## 7. Datenbank-Optimierung

### Empfohlene Indizes (zusammengefasst aus [P-021](#p-021))

```python
class Meta:
    indexes = [
        models.Index(fields=["user", "-created_at"]),    # List-Views
        models.Index(fields=["status", "-updated_at"]),  # Task-Queries
    ]
```

### Django-Debug-Toolbar (nur Dev)

```python
# settings.py
if DEBUG:
    INSTALLED_APPS += ["debug_toolbar"]
    MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
    INTERNAL_IPS = ["127.0.0.1"]
```

→ zeigt N+1-Queries live beim Browsen.

### PostgreSQL-spezifisch (render)

```python
DATABASES["default"]["OPTIONS"] = {"server_side_binding": True}
DATABASES["default"]["CONN_MAX_AGE"] = 600  # Connection-Pooling
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
```

### Slow-Query-Logging

```python
# settings.py (Production)
LOGGING["loggers"]["django.db.backends"] = {
    "handlers": ["console"],
    "level": "DEBUG" if os.environ.get("DJANGO_LOG_SQL") == "1" else "WARNING",
}
```

Mit `DJANGO_LOG_SQL=1` für 1-2 Tage in Prod mitloggen, dann ausmachen.

---

## 8. Netzwerk & HTTP

### P-090 — Kein Gzip/Brotli

**Wirkung:** 🟠 MITTEL (JSON-Payloads 60-80% kleiner) · **Aufwand:** S

**Fix:** Django + WhiteNoise komprimieren Static-Files automatisch (siehe [production-readiness-analysis.md#9-rendercom-deployment](production-readiness-analysis.md)). Für API-JSON:
```python
MIDDLEWARE = [
    "django.middleware.gzip.GZipMiddleware",  # VOR SecurityMiddleware
    "django.middleware.security.SecurityMiddleware",
    # ...
]
```

Warnung: GZip-Middleware + HTTPS → „BREACH"-Attack möglich. Mitigation: `SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"` (bereits empfohlen in Security-Doc F-010) + keine sensiblen Daten in URL.

**Akzeptanzkriterium:** `curl -H "Accept-Encoding: gzip" -v …` zeigt `Content-Encoding: gzip`.

---

### P-091 — HTTP/2 / HTTP/3

render.com liefert HTTP/2 automatisch bei HTTPS → kein Code-Change nötig.

**Check:** `curl --http2 -I https://app.onrender.com` → `HTTP/2 200`.

---

### P-092 — Preload von kritischen API-Calls

**Wirkung:** 🟡 KLEIN · **Aufwand:** S

Beim App-Start (nach Login) direkt parallel laden:
```tsx
// App.tsx
useEffect(() => {
  // Im Hintergrund vorladen
  void queryClient.prefetchQuery({ queryKey: ["gelato", "status"], queryFn: gelatoStatus });
  void queryClient.prefetchQuery({ queryKey: ["templates"], queryFn: listTemplateSets });
}, []);
```

---

## 9. Weitere Performance-Themen

### 9.1 Web-Workers für schwere Frontend-Tasks

**Use-Cases:**
- Preview-Image-Resize (aktuell im Main-Thread → UI-Stutter)
- JSZip-Entpacken großer ZIPs
- Client-seitige Bildkompression vor Upload

**Fix:**
```tsx
// src/workers/imageResize.ts
self.onmessage = async (e: MessageEvent<{ file: ArrayBuffer; maxEdge: number }>) => {
  const bitmap = await createImageBitmap(new Blob([e.data.file]));
  const scale = e.data.maxEdge / Math.max(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
  self.postMessage(await blob.arrayBuffer(), { transfer: [await blob.arrayBuffer()] });
};
```

```tsx
// Usage
const worker = new Worker(new URL("./workers/imageResize.ts", import.meta.url), { type: "module" });
```

---

### 9.2 Image-Optimierung vor Upload (Client)

**Wirkung:** 🟠 MITTEL-GROSS (Upload-Zeit 5× kürzer + weniger Server-Load)

Client komprimiert 50-MB-PNG auf 5-MB-WebP, bevor Upload startet:
```tsx
async function compressBeforeUpload(file: File): Promise<File> {
  if (file.size < 5 * 1024 * 1024) return file;  // <5 MB → unverändert
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/webp", 0.9)
  );
  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}
```

**Wichtig:** Nur für Previews/Marketing-Uploads. **Nicht** für Gelato-Artworks (die brauchen volle DPI für Print).

---

### 9.3 Service-Worker / Offline-Cache

**Optional** für Power-User-Feature:
- Vite-PWA-Plugin (`vite-plugin-pwa`)
- Cached Static-Assets + API-Responses (stale-while-revalidate)

**Aufwand:** L — empfohlen erst Phase 3.

---

### 9.4 SSE (Server-Sent Events) statt Polling

Für AI-Job-Progress:
- Polling alle 2s = 30 Requests/Minute pro aktiven Job.
- SSE = 1 Long-Lived-Connection.

Django-SSE:
```python
from django.http import StreamingHttpResponse
import time, json

def sse_ai_job(request, job_id):
    def event_stream():
        while True:
            job = AIJob.objects.get(id=job_id)
            yield f"data: {json.dumps({'status': job.status})}\n\n"
            if job.status in (AIJob.Status.DONE, AIJob.Status.FAILED):
                break
            time.sleep(1)
    return StreamingHttpResponse(event_stream(), content_type="text/event-stream")
```

**Aber:** Django synchron → 1 Worker pro offenem SSE-Stream blockiert. Besser mit Django-Channels (ASGI) oder direkt WebSockets. → Phase 3.

---

### 9.5 CDN für Static-Assets & R2-Bilder

- **Render:** Static-Files werden bereits über deren CDN ausgeliefert.
- **Cloudflare R2:** Custom-Domain (bereits `AWS_S3_CUSTOM_DOMAIN` vorgesehen) → CDN.
- **Fonts:** Entweder Google Fonts CDN oder self-host (Fontsource). P-071.

---

### 9.6 React 19 Compiler (optional, experimental)

```bash
npm install -D babel-plugin-react-compiler
```

```ts
// vite.config.ts
plugins: [
  react({
    babel: { plugins: ["babel-plugin-react-compiler"] },
  }),
],
```

Macht `memo`/`useCallback` großteils überflüssig. **Aber:** Noch RC, bei komplexen Komponenten vorab ausprobieren.

---

### 9.7 Preload + DNS-Prefetch für externe Services

```html
<!-- index.html -->
<link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
<link rel="dns-prefetch" href="https://openapi.etsy.com" />
<link rel="dns-prefetch" href="https://ecommerce.gelatoapis.com" />
<link rel="preconnect" href="https://<r2-domain>.r2.cloudflarestorage.com" crossorigin />
```

---

## 10. Monitoring & Benchmarks

### Empfohlene Tools

| Tool | Zweck | Integration |
|------|-------|-------------|
| **Sentry Performance** | API-Latenz + Frontend-Render-Spans | `sentry-sdk` (siehe Security-Doc F-051) |
| **django-silk** | Profiling per Request (Dev) | `pip install django-silk` |
| **django-debug-toolbar** | N+1 & SQL live (Dev) | siehe oben |
| **Chrome Lighthouse** | Frontend-Audit | CI über `@lhci/cli` |
| **Web-Vitals** | Core-Web-Vitals im Prod-Code | `web-vitals` NPM-Package |
| **Render Metrics** | CPU/RAM/Request-Rate | eingebaut im render-Dashboard |

### Web-Vitals in Frontend einbauen

```tsx
// src/lib/vitals.ts
import { onCLS, onFID, onLCP, onINP, onTTFB } from "web-vitals";

const report = (metric: { name: string; value: number }) => {
  // an /api/metrics/ POSTen oder Sentry.captureMessage
  void fetch("/api/metrics/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metric),
  });
};

onCLS(report);
onFID(report);
onLCP(report);
onINP(report);
onTTFB(report);
```

### Ziel-Metriken

| Metrik | Ziel |
|--------|------|
| LCP (Largest Contentful Paint) | < 2.5 s |
| INP (Interaction to Next Paint) | < 200 ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| API-p50 (Standard-Endpoints) | < 200 ms |
| API-p95 | < 1 s |
| AI-Job-Acceptance (202-Response) | < 500 ms |
| Bundle Initial (gzipped) | < 200 KB |

### Load-Testing

```bash
# Ein paar lokale Lasttests
pip install locust
# locustfile.py mit Login + Template-List-Flow
locust --headless --users 50 --spawn-rate 5 --host https://staging.onrender.com
```

---

## 11. Umsetzungs-Roadmap

### Phase 1 — „Heiße" API-Calls (Woche 1)

Wirkung: **80% der User-spürbaren Verbesserung**.

- [ ] **P-001** Gemini-Async via Celery + AIJob-Model
- [ ] **P-002** Gelato-Export: Upload in Worker
- [ ] **P-003** Automation-ZIP in Worker
- [ ] **P-041** Frontend-Polling-Hook (`useAIJob`, `useGelatoJob`)
- [x] **P-033** Gunicorn-Threads statt Workers (`gthread`, `Procfile` / `render.yaml`)
- [ ] **Monitoring:** Sentry + Web-Vitals aufsetzen

### Phase 2 — Frontend-Performance (Woche 2)

- [x] **P-050** Lazy-Routes für alle Top-Level-Views (`AppShell` + bestehende Lazy-Tabs in `App.tsx`)
- [x] **P-051** Vite-Build-Flags (`build` + `esbuild.drop` in `vite.config.ts`)
- [ ] **P-040** React-Query einführen (große Umstellung)
- [x] **P-060** CanvasViewport memoization + RAF-Throttle
- [ ] **P-061** Virtualisierung der Artwork-Liste
- [x] **P-070** `console.*` in Prod-Build droppen
- [x] **P-080** jszip lazy-laden

### Phase 3 — DB & Caching (Woche 3)

- [x] **P-020** DRF-Pagination aktivieren (`StandardLimitOffsetPagination`; Frontend `/api/sets/` entpaginiert)
- [ ] **P-022** TemplateSet-Serializer List vs Detail
- [x] **P-021** DB-Indizes + Migration
- [ ] **P-031** Redis-Cache für Etsy/Gelato-Responses
- [x] **P-005** Etsy-Listings `includes=Images` (+ Fallback pro Listing)
- [x] **P-030** R2-Cleanup: Middleware nur bei schreibenden API-Calls (Celery-Beat + Entfernen der Middleware weiterhin optional)

### Phase 4 — Polish (Woche 4)

- [ ] **P-004** Pillow-SIMD + Queue-Routing
- [x] **P-062** Framer-Motion-Layout-Optimierung (`LayerManager`)
- [x] **P-063** Tailwind `transition-all` präzisieren (`index.css`)
- [x] **P-071** Font-Dopplung beheben (`@fontsource-variable/inter` in `main.tsx`, Google Fonts aus `index.html`)
- [x] **P-090** Gzip-Middleware (`settings.MIDDLEWARE`)
- [ ] **P-092** Prefetch beim App-Start
- [x] **P-032** AIConnection via post_save-Signal (+ leere Zeile in `AIStatusView` wie „nicht verbunden“)
- [ ] **P-081** Arbitrary-Shadows als Theme-Token

### Phase 5 — Advanced (optional)

- [ ] SSE statt Polling (9.4)
- [ ] Service-Worker/PWA (9.3)
- [ ] Client-seitige Bildkompression (9.2)
- [ ] Web-Workers für Previews (9.1)
- [ ] React-Compiler ausprobieren (9.6)

---

## Anhang A — Benchmarks vor/nach (Zielwerte)

| Flow | Ist | Soll (Phase 1-2) | Soll (Phase 3-4) |
|------|-----|------------------|------------------|
| Login → Dashboard sichtbar | ? | 2.0 s | 1.2 s |
| Initial-Bundle (gzipped) | ~500 KB | 200 KB | 150 KB |
| `GET /api/template-sets/` | 300-2000 ms | 200 ms | 50 ms (cache) |
| `POST /api/ai/generate-listing/` | 30-120 s | 500 ms (202) | 500 ms |
| `POST /api/gelato/export/` (5 files) | 50-200 s | <1 s (202) | <1 s |
| `GET /api/etsy/listings/` | 15-30 s | 3 s | 200 ms (cache) |
| Template-Editor Input-Lag | 20-50 ms | <16 ms | <8 ms |
| Artwork-Grid bei 100 Items | Ruckelig | Smooth (virt.) | Smooth |

---

## Anhang B — Quick-Commands

```bash
# Bundle-Analyzer
npm install -D rollup-plugin-visualizer
# vite.config.ts: plugins.push(visualizer({ open: true }))
npm run build

# Django-Silk
pip install django-silk
# settings.py: INSTALLED_APPS + MIDDLEWARE ergänzen
python manage.py migrate silk
# Browse /silk/

# Load-Test
pip install locust
locust -f locustfile.py --host http://127.0.0.1:8000

# Chrome Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:5173
```

---

## Anhang C — Abhängigkeiten zwischen Findings

```
P-001 (Gemini-Async) ─┐
P-002 (Gelato-Async) ─┼─► P-041 (Frontend-Polling)
P-003 (Automation)   ─┘

P-040 (React-Query) ──► erleichtert P-041, P-031, viele andere

P-050 (Lazy-Routes) ──► reduziert Initial-Bundle ─► bessere LCP/TTI

P-021 (DB-Indizes) ───► Voraussetzung für P-022, P-031

P-020 (Pagination) ───► reduziert Payload-Size für alle List-Views
```

Implementierungs-Reihenfolge sollte diese Abhängigkeiten respektieren.

---

**Ende der Performance-Analyse.**

Bei jeder umgesetzten Maßnahme: Before/After-Benchmark festhalten (z.B. mit Chrome DevTools Performance-Recording). Metrik-PRs sind gute Referenz für zukünftige Optimierungen.
