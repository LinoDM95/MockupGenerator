from __future__ import annotations

import json
import logging
import re
import time
from io import BytesIO
from typing import Any, Callable

from PIL import Image as PILImage

from .base import (
    AIProviderError,
    AIResponseParseError,
    AIServiceUnavailableError,
    BaseAIProvider,
    SYSTEM_PROMPT,
    TARGET_INSTRUCTIONS,
    VALID_TARGET_TYPES,
)
from .listing_validation import audit_scout_draft

logger = logging.getLogger(__name__)

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```")


def _root_to_dict(obj: Any) -> dict | None:
    """If the model returns [...] with one object or a bare object, normalise to dict."""
    if isinstance(obj, dict):
        return obj
    if (
        isinstance(obj, list)
        and len(obj) >= 1
        and isinstance(obj[0], dict)
    ):
        return obj[0]
    return None


def _extract_balanced_object(s: str, start: int) -> str | None:
    """Return substring of first balanced `{...}` from index ``start``, or None.

    Respects JSON string literals so `}` inside strings does not end the object.
    """
    if start < 0 or start >= len(s) or s[start] != "{":
        return None
    depth = 0
    i = start
    in_str = False
    esc = False
    while i < len(s):
        ch = s[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            i += 1
            continue
        if ch == '"':
            in_str = True
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
        i += 1
    return None


def _balanced_dict_candidates(text: str) -> list[dict[str, Any]]:
    """Try every `{` with balanced extraction; return all successfully parsed dicts."""
    out: list[dict[str, Any]] = []
    for pos in range(len(text)):
        if text[pos] != "{":
            continue
        chunk = _extract_balanced_object(text, pos)
        if not chunk:
            continue
        try:
            obj = json.loads(chunk)
        except json.JSONDecodeError:
            continue
        d = _root_to_dict(obj)
        if d is not None:
            out.append(d)
    return out


def _pick_largest_dict(candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Prefer the root object (usually longest JSON); tie-break by expert-like keys."""
    if not candidates:
        return None

    def rank(d: dict[str, Any]) -> tuple[int, int]:
        bonus = 0
        if "data" in d:
            bonus += 3
        if "thought" in d:
            bonus += 1
        if "titles" in d or "critique" in d:
            bonus += 2
        raw_len = len(json.dumps(d, ensure_ascii=False))
        return (bonus, raw_len)

    return max(candidates, key=rank)


def _extract_json(raw: str) -> dict:
    """Parse JSON from the model response, handling markdown wrappers and noise."""
    text = raw.strip()

    def _try_dict(s: str) -> dict | None:
        try:
            obj = json.loads(s)
        except json.JSONDecodeError:
            return None
        return _root_to_dict(obj)

    tried = _try_dict(text)
    if tried is not None:
        return tried

    match = _JSON_BLOCK_RE.search(text)
    if match:
        tried = _try_dict(match.group(1).strip())
        if tried is not None:
            return tried

    first = text.find("{")
    if first != -1:
        chunk = _extract_balanced_object(text, first)
        if chunk:
            tried = _try_dict(chunk)
            if tried is not None:
                return tried

    candidates = _balanced_dict_candidates(text)
    picked = _pick_largest_dict(candidates)
    if picked is not None:
        return picked

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        tried = _try_dict(text[start : end + 1])
        if tried is not None:
            return tried

    logger.warning(
        "JSON parse failed – raw response (first 500 chars): %s",
        text[:500],
    )
    raise AIResponseParseError(
        "Die KI-Antwort konnte nicht als JSON interpretiert werden. "
        "Bitte erneut versuchen."
    )


def _coerce_expert_data_field(data: Any) -> dict[str, Any] | None:
    """Turn ``data`` into a dict (string JSON, single-element list, etc.)."""
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        s = data.strip()
        if not s:
            return None
        try:
            inner = json.loads(s)
        except json.JSONDecodeError:
            return None
        if isinstance(inner, dict):
            return inner
        if isinstance(inner, list) and len(inner) == 1 and isinstance(inner[0], dict):
            return inner[0]
        return None
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict):
        return data[0]
    return None


def _parse_thought_data_response(raw: str) -> tuple[str, dict[str, Any]]:
    """Parse expert-step JSON: ``{"thought": str, "data": {...}}`` with fallbacks."""
    parsed = _extract_json(raw)

    thought_raw = parsed.get("thought", "")
    if not isinstance(thought_raw, str):
        thought = str(thought_raw) if thought_raw is not None else ""
    else:
        thought = thought_raw

    data = _coerce_expert_data_field(parsed.get("data"))
    if data is not None:
        return thought, data

    # Flattened listing draft (scout / editor): keys at root instead of under "data"
    if "titles" in parsed and "tags" in parsed:
        return thought, {
            "titles": parsed.get("titles"),
            "tags": parsed.get("tags"),
            "description": parsed.get("description", ""),
        }

    # Flattened critic payload
    if any(
        k in parsed
        for k in ("critique", "flaws", "legal_risks", "suggestions")
    ):
        def _coerce_str_list(key: str) -> list[str]:
            v = parsed.get(key)
            if not isinstance(v, list):
                return []
            out: list[str] = []
            for x in v:
                s = str(x).strip()
                if s:
                    out.append(s)
            return out

        db_raw = parsed.get("deterministic_blocking")
        if isinstance(db_raw, bool):
            db = db_raw
        else:
            db = False
        return thought, {
            "critique": parsed.get("critique", ""),
            "flaws": parsed["flaws"]
            if isinstance(parsed.get("flaws"), list)
            else [],
            "legal_risks": parsed["legal_risks"]
            if isinstance(parsed.get("legal_risks"), list)
            else [],
            "suggestions": parsed["suggestions"]
            if isinstance(parsed.get("suggestions"), list)
            else [],
            "title_tag_word_conflicts": _coerce_str_list(
                "title_tag_word_conflicts"
            ),
            "subjective_words_in_title": _coerce_str_list(
                "subjective_words_in_title"
            ),
            "tags_over_20_chars": _coerce_str_list("tags_over_20_chars"),
            "deterministic_blocking": db,
        }

    raise AIResponseParseError("Expert-Antwort: Feld 'data' fehlt oder ist ungültig.")


def _fill_critic_thought_if_empty(thought: str, data: dict[str, Any]) -> str:
    """If the model leaves ``thought`` empty, derive a short line from critique or list fields."""
    if (thought or "").strip():
        return thought
    cr = data.get("critique")
    if isinstance(cr, str) and cr.strip():
        return cr.strip()[:400]
    for key in (
        "flaws",
        "title_tag_word_conflicts",
        "subjective_words_in_title",
        "tags_over_20_chars",
        "suggestions",
        "legal_risks",
    ):
        v = data.get(key)
        if isinstance(v, list) and v:
            lines = [str(x).strip() for x in v[:4] if str(x).strip()]
            if lines:
                return " · ".join(lines)[:400]
    return thought


def _merge_audit_into_critic_data(
    model_data: dict[str, Any],
    audit: dict[str, Any],
) -> dict[str, Any]:
    """Overlay deterministic audit; append matching ``[BLOCKING]`` lines to ``flaws``."""
    out = dict(model_data)
    out["title_tag_word_conflicts"] = audit["title_tag_word_conflicts"]
    out["subjective_words_in_title"] = audit["subjective_words_in_title"]
    out["tags_over_20_chars"] = audit["tags_over_20_chars"]
    out["deterministic_blocking"] = audit["deterministic_blocking"]

    flaws = out.get("flaws")
    if not isinstance(flaws, list):
        flaws = []
    flaws_str = [str(x) for x in flaws]
    seen = set(flaws_str)

    def add_flaw(msg: str) -> None:
        if msg not in seen:
            flaws_str.append(msg)
            seen.add(msg)

    for x in audit["title_tag_word_conflicts"]:
        add_flaw(f"[BLOCKING] {x}")
    for x in audit["subjective_words_in_title"]:
        add_flaw(f"[BLOCKING] {x}")
    for x in audit["tags_over_20_chars"]:
        add_flaw(f"[BLOCKING] Tag-Länge: {x}")
    out["flaws"] = flaws_str
    return out


def _fill_scout_thought_if_empty(thought: str, data: dict[str, Any]) -> str:
    """If the model leaves ``thought`` empty, derive a short line from draft listing fields."""
    if (thought or "").strip():
        return thought
    titles = data.get("titles")
    if isinstance(titles, list):
        for x in titles:
            s = str(x).strip()
            if s:
                return s[:200]
    desc = data.get("description")
    if isinstance(desc, str) and desc.strip():
        return desc.strip()[:300]
    return thought


_MAX_TAG_LEN = 20
_REQUIRED_TAG_COUNT = 13


def _truncate_tag(tag: str) -> str:
    """Shorten a tag to ≤ 20 chars at a word boundary."""
    tag = tag.strip()
    if len(tag) <= _MAX_TAG_LEN:
        return tag
    truncated = tag[:_MAX_TAG_LEN]
    last_space = truncated.rfind(" ")
    if last_space > 5:
        truncated = truncated[:last_space]
    return truncated.rstrip()


def _normalise_result(data: dict) -> dict:
    """Ensure the result always has the three expected keys with correct types.

    Post-processing:
    - Tags are truncated to ≤ 20 chars (Etsy hard limit).
    - Duplicate tags are removed.
    - Exactly 13 tags are enforced (excess trimmed, shortage kept as-is).
    """
    titles = data.get("titles")
    if not isinstance(titles, list):
        titles = []
    titles = [str(t).strip() for t in titles if str(t).strip()]

    raw_tags = data.get("tags")
    if not isinstance(raw_tags, list):
        raw_tags = []

    seen: set[str] = set()
    tags: list[str] = []
    for t in raw_tags:
        raw_s = str(t).strip()
        cleaned = _truncate_tag(str(t))
        if raw_s != cleaned:
            logger.debug(
                "Tag normalised (truncate/trim): %r -> %r",
                raw_s,
                cleaned,
            )
        lower = cleaned.lower()
        if not cleaned or lower in seen:
            continue
        seen.add(lower)
        tags.append(cleaned)
    tags = tags[:_REQUIRED_TAG_COUNT]

    description = data.get("description", "")
    if not isinstance(description, str):
        description = str(description)

    return {"titles": titles, "tags": tags, "description": description}


def _image_to_pil(image_file: Any) -> PILImage.Image:
    """Convert a Django UploadedFile (or file-like) to a PIL Image."""
    image_file.seek(0)
    img = PILImage.open(image_file)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    return img


def _is_503(exc: Exception) -> bool:
    """Check whether an exception represents a 503 / UNAVAILABLE error."""
    s = str(exc)
    return "503" in s or "UNAVAILABLE" in s


_FALLBACK_CHAIN: dict[str, str] = {
    "gemini-2.5-pro": "gemini-2.5-flash",
    "gemini-3-pro-preview": "gemini-3-flash-preview",
    "gemini-3.1-pro-preview": "gemini-3-flash-preview",
    "gemini-3-flash-preview": "gemini-2.5-flash",
    "gemini-2.5-flash": "gemini-2.5-flash-lite",
    "gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
}

_RETRIES_PRIMARY = 4
_RETRIES_FALLBACK = 2
_BACKOFF_BASE = 10

# Appended in _make_config when use_grounding is True (standard listing + all expert steps).
GROUNDING_MANDATORY_BLOCK = """
═══════════════════════════════════════════════════════════════
MANDATORY: ACTIVE WEB SEARCH FOR THIS REQUEST
═══════════════════════════════════════════════════════════════
Google Search tools are enabled for this call. Treat search as REQUIRED, not optional.

Before you finalize your JSON output you MUST run targeted search queries to inform
your work — for example: current buyer search phrases and long-tail demand for this
product niche, seasonal or trend context where relevant, and (for critique steps)
factual checks on trademark/brand/IP or policy topics when the draft warrants it.

Do not answer from the image and static assumptions alone when search can improve
keywords or risk assessment. Fold findings into titles, tags, and description; do not
paste URLs or search-result dumps into the JSON fields.
"""

EXPERT_SCOUT_ADDENDUM = """
You are Agent 1 — Trend Scout. Analyse the product image for Etsy (2026).
Prioritise high-volume long-tail keywords with clear buyer intent (browse + buy).
When web search is enabled for this request, you MUST use it to validate trends and demand (see system block above).

Return ONLY valid JSON with exactly this shape (no markdown fences):
{"thought": "<your analysis chain in English or German>", "data": {"titles": ["","",""], "tags": ["",...13 items], "description": "<string>"}}

The data object is a DRAFT listing (3 title options, exactly 13 tags each ≤20 characters, description).
Follow the same SEO discipline as the system rules for titles, tags, and description structure.
"""

EXPERT_CRITIC_SYSTEM = """\
You are Agent 2 — Ruthless Critic for Etsy listings (2026 SEO). Critique only — same bar as \
SYSTEM rules for Scout/Editor: Speak Human, Zero Redundancy title↔tags, ≤20 chars per tag, 13 tags, 3 titles.

AUDIT CHECKLIST — violations belong in `flaws` with prefix "[BLOCKING]" when they block launch quality.

1) Title vs tags (Zero redundancy)
   - Tokenize each title (non-letters → split; lowercase). Ignore stopwords: EN the,a,an,and,or,of,for,with,in — DE der,die,das,ein,eine,und,oder,mit,für,von.
   - Any significant title word that appears as a whole word in any tag → record in `title_tag_word_conflicts` and echo as "[BLOCKING] Title–tag overlap: …" in `flaws`.

2) Subjectivity in titles
   - No hype adjectives in titles (e.g. beautiful, perfect, unique, amazing / wunderschön, perfekt, einzigartig). List hits in `subjective_words_in_title` and add matching "[BLOCKING]" lines to `flaws`.

3) Tag length
   - Any tag >20 characters → `tags_over_20_chars` + "[BLOCKING]" in `flaws` (backend may still truncate; report regardless).

Also: merciless but constructive; flag dead tags and trademark/brand/IP risks in `legal_risks`.
Do NOT rewrite the full listing. No polite preamble. Put detail in `data.critique`; keep `thought` ≤2 short sentences.

JSON `data` MUST include: critique, flaws, legal_risks, suggestions, title_tag_word_conflicts, subjective_words_in_title, tags_over_20_chars, deterministic_blocking (set to false; the server overwrites deterministic_blocking after parsing).
"""

EXPERT_EDITOR_ADDENDUM = """
You are Agent 3 — Listing Editor. Merge the scout draft with the critic feedback.
Produce the FINAL Etsy listing as JSON inside "data":
- Title: put the top 1–3 buyer keywords at the beginning (first ~40 chars matter).
- Exactly 13 tags, each max 20 characters; no duplicate words from the chosen title in tags.
- Description: follow the system template style.

Return ONLY valid JSON:
{"thought": "<short closing statement>", "data": {"titles": ["","",""], "tags": ["",...13], "description": "<string>"}}
"""


class GeminiProvider(BaseAIProvider):
    """Google Gemini multimodal provider using the new ``google-genai`` SDK.

    Accepts per-user ``api_key`` and ``model_name`` instead of reading from
    Django settings, so every account can use their own credentials.

    On persistent 503 errors the provider automatically falls back through
    a lighter model chain to maximise availability.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash") -> None:
        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise AIProviderError(
                "Das Paket 'google-genai' ist nicht installiert. "
                "Bitte 'pip install google-genai' ausführen."
            ) from exc

        if not api_key:
            raise AIProviderError(
                "Kein API-Key konfiguriert. "
                "Bitte unter KI-Integration einen API-Key hinterlegen."
            )

        self._client = genai.Client(api_key=api_key)
        self._model_name = model_name
        self._types = types

    def _is_pro_model(self) -> bool:
        return "pro" in self._model_name.lower()

    def _safety_settings(self) -> list:
        safety_off = self._types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="OFF",
        )
        return [
            safety_off,
            self._types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="OFF"),
            self._types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"),
            self._types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"),
        ]

    def _make_config(
        self,
        *,
        system_instruction: str,
        temperature: float,
        use_grounding: bool,
        response_schema: Any | None = None,
        max_output_tokens: int = 8192,
    ) -> Any:
        is_pro = self._is_pro_model()
        resolution = (
            self._types.MediaResolution.MEDIA_RESOLUTION_HIGH
            if is_pro
            else self._types.MediaResolution.MEDIA_RESOLUTION_MEDIUM
        )
        tools: list | None = None
        if use_grounding:
            tools = [self._types.Tool(google_search=self._types.GoogleSearch())]
            system_instruction = (
                system_instruction.rstrip()
                + "\n\n"
                + GROUNDING_MANDATORY_BLOCK.strip()
            )
        cfg_kw: dict[str, Any] = dict(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            media_resolution=resolution,
            tools=tools,
            safety_settings=self._safety_settings(),
        )
        # Gemini: search grounding (tools) + response_mime_type application/json are mutually
        # exclusive — 400 INVALID_ARGUMENT otherwise. Fall back to prompt-level JSON + parser.
        if response_schema is not None and not use_grounding:
            cfg_kw["response_mime_type"] = "application/json"
            cfg_kw["response_schema"] = response_schema
        elif response_schema is not None and use_grounding:
            logger.debug(
                "Structured JSON (response_schema) disabled because Google Search grounding "
                "is active; using plain JSON parsing instead.",
            )
        return self._types.GenerateContentConfig(**cfg_kw)

    def _schema_listing_flat(self) -> Any:
        """Top-level JSON for generate_listing_data: titles, tags, description."""
        t = self._types
        ty = t.Type
        str_list = t.Schema(type=ty.ARRAY, items=t.Schema(type=ty.STRING))
        return t.Schema(
            type=ty.OBJECT,
            properties={
                "titles": str_list,
                "tags": str_list,
                "description": t.Schema(type=ty.STRING),
            },
            required=["titles", "tags", "description"],
        )

    def _schema_scout_or_editor_data(self) -> Any:
        t = self._types
        ty = t.Type
        str_list = t.Schema(type=ty.ARRAY, items=t.Schema(type=ty.STRING))
        return t.Schema(
            type=ty.OBJECT,
            properties={
                "titles": str_list,
                "tags": str_list,
                "description": t.Schema(type=ty.STRING),
            },
            required=["titles", "tags", "description"],
        )

    def _schema_critic_data(self) -> Any:
        t = self._types
        ty = t.Type
        str_list = t.Schema(type=ty.ARRAY, items=t.Schema(type=ty.STRING))
        return t.Schema(
            type=ty.OBJECT,
            properties={
                "critique": t.Schema(type=ty.STRING),
                "flaws": str_list,
                "legal_risks": str_list,
                "suggestions": str_list,
                "title_tag_word_conflicts": str_list,
                "subjective_words_in_title": str_list,
                "tags_over_20_chars": str_list,
                "deterministic_blocking": t.Schema(type=ty.BOOLEAN),
            },
            required=["critique", "flaws", "legal_risks", "suggestions"],
        )

    def _schema_expert_thought_data(self, data_inner: Any) -> Any:
        """Wrap expert steps: {\"thought\": str, \"data\": { ... }}."""
        t = self._types
        ty = t.Type
        return t.Schema(
            type=ty.OBJECT,
            properties={
                "thought": t.Schema(type=ty.STRING),
                "data": data_inner,
            },
            required=["thought", "data"],
        )

    def _image_file_to_part(self, image_file: Any) -> Any:
        pil_image = _image_to_pil(image_file)
        is_pro = self._is_pro_model()
        max_dim = 1536 if is_pro else 1024
        if max(pil_image.size) > max_dim:
            pil_image.thumbnail((max_dim, max_dim), PILImage.Resampling.LANCZOS)

        buf = BytesIO()
        save_format = "JPEG"
        if pil_image.mode == "RGBA":
            save_format = "PNG"
        pil_image.save(buf, format=save_format, quality=80)
        buf.seek(0)
        mime = "image/jpeg" if save_format == "JPEG" else "image/png"
        return self._types.Part.from_bytes(data=buf.getvalue(), mime_type=mime)

    def _run_json_parse_loop(
        self,
        contents: list,
        config: Any,
        parse: Callable[[str], Any],
    ) -> Any:
        models_to_try = [self._model_name]
        fallback = _FALLBACK_CHAIN.get(self._model_name)
        if fallback:
            models_to_try.append(fallback)

        last_error: Exception | None = None

        for model_name in models_to_try:
            is_primary = model_name == self._model_name
            max_retries = _RETRIES_PRIMARY if is_primary else _RETRIES_FALLBACK

            for attempt in range(max_retries):
                if attempt > 0:
                    delay = _BACKOFF_BASE * (2 ** (attempt - 1))
                    logger.info(
                        "Retry %d/%d für %s nach %ds …",
                        attempt + 1, max_retries, model_name, delay,
                    )
                    time.sleep(delay)

                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config,
                    )
                except Exception as exc:
                    last_error = exc
                    if _is_503(exc):
                        logger.warning(
                            "Gemini %s 503 UNAVAILABLE (Versuch %d/%d)",
                            model_name, attempt + 1, max_retries,
                        )
                        continue
                    logger.warning(
                        "Gemini %s Fehler (Versuch %d/%d): %s",
                        model_name, attempt + 1, max_retries, str(exc)[:200],
                    )
                    break

                text = response.text or ""

                if not text and hasattr(response, "candidates") and response.candidates:
                    candidate = response.candidates[0]
                    reason = getattr(candidate, "finish_reason", None)
                    logger.warning(
                        "Gemini %s leere Antwort (finish_reason=%s, Versuch %d/%d)",
                        model_name, reason, attempt + 1, max_retries,
                    )
                    continue

                if not text:
                    logger.warning(
                        "Gemini %s leere Antwort (Versuch %d/%d)",
                        model_name, attempt + 1, max_retries,
                    )
                    continue

                try:
                    result = parse(text)
                    if model_name != self._model_name:
                        logger.info(
                            "Fallback erfolgreich: %s → %s",
                            self._model_name, model_name,
                        )
                    return result
                except AIResponseParseError:
                    fin = None
                    if hasattr(response, "candidates") and response.candidates:
                        fin = getattr(response.candidates[0], "finish_reason", None)
                    if attempt < max_retries - 1:
                        logger.warning(
                            "Gemini %s JSON-Parse fehlgeschlagen (Versuch %d/%d) – Retry "
                            "(finish_reason=%s, len=%d)",
                            model_name,
                            attempt + 1,
                            max_retries,
                            fin,
                            len(text),
                        )
                        continue
                    raise

            if not is_primary:
                break
            fallback_name = _FALLBACK_CHAIN.get(model_name)
            if fallback_name:
                logger.info(
                    "Modell %s überlastet – Fallback auf %s",
                    model_name, fallback_name,
                )
                time.sleep(3)

        err_str = str(last_error) if last_error else "Unbekannt"
        if _is_503(last_error) if last_error else False:
            tried = " → ".join(models_to_try)
            raise AIServiceUnavailableError(
                f"Alle Modelle überlastet ({tried}). "
                "Bitte in 2–3 Minuten erneut versuchen oder unter "
                "KI-Integration ein anderes Modell wählen."
            )
        raise AIProviderError(f"Gemini-API-Fehler: {err_str[:300]}")

    def generate_listing_data(
        self,
        image_file: Any,
        context_text: str,
        target_type: str = "all",
        style_reference: str = "",
        use_grounding: bool = False,
    ) -> dict:
        if target_type not in VALID_TARGET_TYPES:
            raise AIProviderError(
                f"Ungültiger target_type '{target_type}'. "
                f"Erlaubt: {', '.join(sorted(VALID_TARGET_TYPES))}"
            )

        image_part = self._image_file_to_part(image_file)

        target_instruction = TARGET_INSTRUCTIONS.get(target_type, TARGET_INSTRUCTIONS["all"])
        user_prompt_parts: list[str] = [target_instruction]
        if context_text.strip():
            user_prompt_parts.append(
                f"Seller context: {context_text.strip()}"
            )
        if style_reference.strip():
            user_prompt_parts.append(
                "STYLE CONSISTENCY INSTRUCTION: You are generating listings for "
                "a batch of products from the same shop. You MUST match the exact "
                "same writing tone, sentence structure, description layout, and "
                "formatting as the following reference listing. Only change the "
                "product-specific details (motif, keywords). Keep paragraph count, "
                "bullet-point style, and vocabulary register identical.\n\n"
                f"Reference listing:\n{style_reference.strip()}"
            )
        user_prompt_parts.append(
            "Now analyse the attached product image and generate the listing data as JSON."
        )
        user_text = "\n\n".join(user_prompt_parts)

        config = self._make_config(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            use_grounding=use_grounding,
            response_schema=self._schema_listing_flat(),
        )

        def parse_listing(t: str) -> dict:
            parsed = _extract_json(t)
            return _normalise_result(parsed)

        return self._run_json_parse_loop(
            contents=[image_part, user_text],
            config=config,
            parse=parse_listing,
        )

    def expert_step_1_scout(
        self,
        image_file: Any,
        context_text: str,
        target_type: str = "all",
        style_reference: str = "",
        use_grounding: bool = False,
    ) -> dict[str, Any]:
        if target_type not in VALID_TARGET_TYPES:
            raise AIProviderError(
                f"Ungültiger target_type '{target_type}'. "
                f"Erlaubt: {', '.join(sorted(VALID_TARGET_TYPES))}"
            )

        time.sleep(1)
        image_part = self._image_file_to_part(image_file)
        target_instruction = TARGET_INSTRUCTIONS.get(target_type, TARGET_INSTRUCTIONS["all"])
        parts: list[str] = [target_instruction]
        if context_text.strip():
            parts.append(f"Seller context: {context_text.strip()}")
        if style_reference.strip():
            parts.append(
                "STYLE REFERENCE (batch consistency):\n" + style_reference.strip()
            )
        parts.append(
            "Analyse the attached image and respond with the required JSON "
            "(thought + data with draft titles, 13 tags, description)."
        )
        user_text = "\n\n".join(parts)

        system = SYSTEM_PROMPT + "\n\n" + EXPERT_SCOUT_ADDENDUM.strip()
        config = self._make_config(
            system_instruction=system,
            temperature=0.7,
            use_grounding=use_grounding,
            response_schema=self._schema_expert_thought_data(
                self._schema_scout_or_editor_data(),
            ),
        )

        def parse_expert(t: str) -> dict[str, Any]:
            thought, data = _parse_thought_data_response(t)
            draft = {
                "titles": data.get("titles"),
                "tags": data.get("tags"),
                "description": data.get("description", ""),
            }
            norm = _normalise_result(draft)
            merged: dict[str, Any] = {**data, **norm}
            thought = _fill_scout_thought_if_empty(thought, merged)
            return {"thought": thought, "data": merged}

        thought_data = self._run_json_parse_loop(
            contents=[image_part, user_text],
            config=config,
            parse=parse_expert,
        )
        return thought_data

    def expert_step_2_critic(
        self,
        scout_data: dict[str, Any],
        context_text: str = "",
        use_grounding: bool = False,
    ) -> dict[str, Any]:
        payload = json.dumps(scout_data, ensure_ascii=False)
        user_text = (
            "SCOUT DRAFT (JSON):\n"
            f"{payload}\n\n"
        )
        if context_text.strip():
            user_text += f"Seller context (for risk assessment): {context_text.strip()}\n\n"
        user_text += (
            "Critique this draft only. Remember: no preamble, critique JSON only. "
            "Concentrate exclusively on criticism and structured findings — "
            "no polite filler, do not repeat the entire listing."
        )

        time.sleep(1)
        config = self._make_config(
            system_instruction=EXPERT_CRITIC_SYSTEM,
            temperature=0.5,
            use_grounding=use_grounding,
            response_schema=self._schema_expert_thought_data(self._schema_critic_data()),
            max_output_tokens=16384,
        )

        def parse_expert(t: str) -> dict[str, Any]:
            thought, data = _parse_thought_data_response(t)
            return {"thought": thought, "data": data}

        result = self._run_json_parse_loop(
            contents=[user_text],
            config=config,
            parse=parse_expert,
        )
        audit = audit_scout_draft(scout_data)
        merged = _merge_audit_into_critic_data(result["data"], audit)
        result["data"] = merged
        result["thought"] = _fill_critic_thought_if_empty(result["thought"], merged)
        return result

    def expert_step_3_editor(
        self,
        scout_data: dict[str, Any],
        critic_data: dict[str, Any],
        context_text: str = "",
        use_grounding: bool = False,
    ) -> dict[str, Any]:
        scout_json = json.dumps(scout_data, ensure_ascii=False)
        critic_json = json.dumps(critic_data, ensure_ascii=False)
        user_text = (
            "SCOUT DRAFT:\n"
            f"{scout_json}\n\n"
            "CRITIC FEEDBACK:\n"
            f"{critic_json}\n\n"
        )
        if context_text.strip():
            user_text += f"Seller context: {context_text.strip()}\n\n"
        user_text += EXPERT_EDITOR_ADDENDUM.strip()

        time.sleep(1)
        system = SYSTEM_PROMPT + "\n\n" + EXPERT_EDITOR_ADDENDUM
        config = self._make_config(
            system_instruction=system,
            temperature=0.55,
            use_grounding=use_grounding,
            response_schema=self._schema_expert_thought_data(
                self._schema_scout_or_editor_data(),
            ),
        )

        def parse_expert(t: str) -> dict[str, Any]:
            thought, data = _parse_thought_data_response(t)
            listing = _normalise_result(
                {
                    "titles": data.get("titles"),
                    "tags": data.get("tags"),
                    "description": data.get("description", ""),
                }
            )
            return {"thought": thought, "data": data, "listing": listing}

        return self._run_json_parse_loop(
            contents=[user_text],
            config=config,
            parse=parse_expert,
        )


def normalise_listing_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Public helper for views: normalise scout draft keys to final listing shape."""
    return _normalise_result(
        {
            "titles": data.get("titles"),
            "tags": data.get("tags"),
            "description": data.get("description", ""),
        }
    )
