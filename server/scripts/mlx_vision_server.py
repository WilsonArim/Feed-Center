#!/usr/bin/env python3
"""
MLX Vision OCR Sidecar — Stateless Optical Nerve

Keeps Qwen3-VL-8B-Instruct-4bit loaded in Unified Memory and exposes
a single /extract endpoint for receipt/invoice OCR.

DUAL-LLM ARCHITECTURE: This sidecar is the DUMB optical nerve.
It does ONE thing: extract structured JSON from images. Zero conversation,
zero reasoning, zero state. All intelligence lives in OpenAI (cloud).

Start:
    source ~/mlx-env/bin/activate
    python server/scripts/mlx_vision_server.py

Env:
    MLX_PORT          — default 8787
    MLX_MODEL         — default mlx-community/Qwen3-VL-8B-Instruct-4bit
    MLX_MAX_TOKENS    — default 1024
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import logging
import os
import signal
import sys
import tempfile
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from pathlib import Path

# ── Ensure patch_transformers is loaded BEFORE anything else ──
sys.path.insert(0, str(Path(__file__).resolve().parent))
import patch_transformers  # noqa: F401, E402

import mlx.core as mx  # noqa: E402
from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mlx-sidecar")

# ── Config ──────────────────────────────────────────────────────────
MODEL_ID = os.getenv("MLX_MODEL", "mlx-community/Qwen3-VL-8B-Instruct-4bit")
PORT = int(os.getenv("MLX_PORT", "8787"))
MAX_TOKENS = int(os.getenv("MLX_MAX_TOKENS", "1024"))

# ── Globals (loaded once at startup) ────────────────────────────────
_model = None
_processor = None
_load_time: float = 0.0

# ── Content Cache (SHA-256 → result) ────────────────────────────────
MAX_CACHE_SIZE = int(os.getenv("MLX_CACHE_SIZE", "256"))
_content_cache: OrderedDict[str, dict] = OrderedDict()
_cache_hits = 0
_cache_misses = 0
_fast_path_hits = 0


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _cache_get(key: str) -> dict | None:
    global _cache_hits
    if key in _content_cache:
        _content_cache.move_to_end(key)
        _cache_hits += 1
        return _content_cache[key]
    return None


def _cache_put(key: str, value: dict) -> None:
    global _cache_misses
    _cache_misses += 1
    _content_cache[key] = value
    _content_cache.move_to_end(key)
    while len(_content_cache) > MAX_CACHE_SIZE:
        _content_cache.popitem(last=False)


# ── Fast-Path Merchant Recognition ──────────────────────────────────
# Known merchants whose visual grammar can be recognized without LLM.
FAST_PATH_MERCHANTS: dict[str, dict] = {
    "pingo doce": {
        "merchant": "Pingo Doce",
        "category": "Supermercado",
        "currency": "EUR",
    },
    "continente": {
        "merchant": "Continente",
        "category": "Supermercado",
        "currency": "EUR",
    },
    "lidl": {
        "merchant": "Lidl",
        "category": "Supermercado",
        "currency": "EUR",
    },
    "aldi": {
        "merchant": "Aldi",
        "category": "Supermercado",
        "currency": "EUR",
    },
    "mercadona": {
        "merchant": "Mercadona",
        "category": "Supermercado",
        "currency": "EUR",
    },
    "edp": {
        "merchant": "EDP",
        "category": "Serviços",
        "currency": "EUR",
    },
    "galp": {
        "merchant": "Galp",
        "category": "Transportes",
        "currency": "EUR",
    },
    "meo": {
        "merchant": "MEO",
        "category": "Serviços",
        "currency": "EUR",
    },
    "vodafone": {
        "merchant": "Vodafone",
        "category": "Serviços",
        "currency": "EUR",
    },
    "nos": {
        "merchant": "NOS",
        "category": "Serviços",
        "currency": "EUR",
    },
    "uber": {
        "merchant": "Uber",
        "category": "Transportes",
        "currency": "EUR",
    },
    "bolt": {
        "merchant": "Bolt",
        "category": "Transportes",
        "currency": "EUR",
    },
    "worten": {
        "merchant": "Worten",
        "category": "Tecnologia",
        "currency": "EUR",
    },
    "fnac": {
        "merchant": "FNAC",
        "category": "Tecnologia",
        "currency": "EUR",
    },
    "zara": {
        "merchant": "Zara",
        "category": "Vestuário",
        "currency": "EUR",
    },
    "primark": {
        "merchant": "Primark",
        "category": "Vestuário",
        "currency": "EUR",
    },
    "mcdonald": {
        "merchant": "McDonald's",
        "category": "Restaurante",
        "currency": "EUR",
    },
    "burger king": {
        "merchant": "Burger King",
        "category": "Restaurante",
        "currency": "EUR",
    },
    "ikea": {
        "merchant": "IKEA",
        "category": "Outros",
        "currency": "EUR",
    },
}


def _try_fast_path(raw_text: str) -> dict | None:
    """If the model output contains a known merchant name, use the fast-path."""
    global _fast_path_hits
    text_lower = raw_text.lower()
    for key, meta in FAST_PATH_MERCHANTS.items():
        if key in text_lower:
            _fast_path_hits += 1
            return meta
    return None


EXTRACT_SYSTEM_PROMPT = """You are a receipt and invoice data extractor for a personal finance system.
Analyze the image and return ONLY valid JSON with this exact structure:
{
  "merchant": "store or company name",
  "total": 0.00,
  "currency": "EUR",
  "date": "YYYY-MM-DD or null",
  "category": "best-fit category",
  "items": [
    {"name": "item description", "quantity": 1, "price": 0.00}
  ]
}
Rules:
- Extract ALL visible items with their prices.
- Use the exact merchant name as printed.
- Infer currency from symbols (€=EUR, $=USD, £=GBP) or context.
- Date format: YYYY-MM-DD. Use null if not visible.
- Category: one of Supermercado, Restaurante, Transportes, Saúde, Tecnologia, Serviços, Vestuário, Entretenimento, Educação, Outros.
- Never invent data not visible in the image."""

# REASON_SYSTEM_PROMPT removed — Qwen is OCR-only (Dual-LLM Architecture)


def _load_model():
    global _model, _processor, _load_time
    from mlx_vlm import load

    logger.info(f"Loading {MODEL_ID}...")
    t0 = time.perf_counter()
    _model, _processor = load(MODEL_ID)
    _load_time = time.perf_counter() - t0
    logger.info(f"✅ Model loaded in {_load_time:.1f}s")


def _generate_from_image(image_path: str, prompt: str, max_tokens: int = MAX_TOKENS) -> dict:
    from mlx_vlm import generate
    from mlx_vlm.prompt_utils import apply_chat_template

    formatted = apply_chat_template(_processor, prompt, num_images=1)

    t0 = time.perf_counter()
    result = generate(
        _model,
        _processor,
        formatted,
        [image_path],
        max_tokens=max_tokens,
        verbose=False,
    )
    gen_time = time.perf_counter() - t0

    text = result.text if hasattr(result, "text") else str(result)
    tps = getattr(result, "generation_tps", 0)
    peak = getattr(result, "peak_memory", 0)

    return {
        "text": text,
        "generation_time_s": round(gen_time, 2),
        "tokens_per_second": round(tps, 1) if tps else None,
        "peak_memory_gb": round(peak, 2) if peak else None,
    }


# _generate_text() removed — Qwen is OCR-only (Dual-LLM Architecture)


# ── Pydantic Models ────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded image data")
    mime_type: str = Field(default="image/png", description="Image MIME type")
    prompt: str | None = Field(default=None, description="Override extraction prompt")
    max_tokens: int = Field(default=MAX_TOKENS, ge=64, le=4096)


# ReasonRequest removed — Qwen is OCR-only (Dual-LLM Architecture)


# ── App Lifecycle ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_model()
    yield
    logger.info("Shutting down MLX sidecar")
    mx.metal.clear_cache()


app = FastAPI(
    title="MLX Vision OCR Sidecar",
    description="Stateless optical nerve — receipt/invoice OCR only",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Endpoints ──────────────────────────────────────────────────────
# DUAL-LLM ARCHITECTURE: Only /health and /extract are exposed.
# No /reason endpoint — all reasoning is delegated to OpenAI (cloud).

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "role": "ocr-only",
        "model": MODEL_ID,
        "load_time_s": round(_load_time, 2),
        "ready": _model is not None,
        "cache": {
            "size": len(_content_cache),
            "max_size": MAX_CACHE_SIZE,
            "hits": _cache_hits,
            "misses": _cache_misses,
            "fast_path_hits": _fast_path_hits,
            "hit_rate": round(_cache_hits / max(1, _cache_hits + _cache_misses), 3),
        },
    }


@app.post("/extract")
async def extract(req: ExtractRequest):
    if _model is None:
        raise HTTPException(503, "Model not loaded")

    try:
        image_bytes = base64.b64decode(req.image)
    except Exception:
        raise HTTPException(400, "Invalid base64 image data")

    # ── SHA-256 Content Hash — bypass LLM if cached ─────────────
    content_hash = _sha256(image_bytes)
    cached = _cache_get(content_hash)
    if cached is not None:
        logger.info(f"CACHE HIT [{content_hash[:12]}] — LLM bypass, <5ms")
        return {
            **cached,
            "cache": "hit",
            "content_hash": content_hash[:16],
        }

    ext = req.mime_type.split("/")[-1].replace("jpeg", "jpg")
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as f:
        f.write(image_bytes)
        tmp_path = f.name

    try:
        prompt = req.prompt or EXTRACT_SYSTEM_PROMPT
        raw = _generate_from_image(tmp_path, prompt, req.max_tokens)

        # Try to parse the text as JSON
        extracted = None
        text = raw["text"]
        # Strip markdown fences if present
        if "```json" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        try:
            extracted = json.loads(text)
        except json.JSONDecodeError:
            extracted = None

        # ── Fast-Path enrichment for known merchants ────────────
        if extracted and isinstance(extracted, dict):
            merchant_str = extracted.get("merchant", "") or ""
            fast_meta = _try_fast_path(merchant_str)
            if fast_meta:
                extracted["merchant"] = fast_meta["merchant"]
                if not extracted.get("category"):
                    extracted["category"] = fast_meta["category"]
                if not extracted.get("currency"):
                    extracted["currency"] = fast_meta["currency"]
                logger.info(f"FAST-PATH [{fast_meta['merchant']}] — enriched from known entity")

        result = {
            "status": "ok",
            "extraction": extracted,
            "raw_text": raw["text"],
            "stats": {
                "generation_time_s": raw["generation_time_s"],
                "tokens_per_second": raw["tokens_per_second"],
                "peak_memory_gb": raw["peak_memory_gb"],
            },
        }

        # Cache the successful extraction
        if extracted is not None:
            _cache_put(content_hash, result)
            logger.info(f"CACHE STORE [{content_hash[:12]}] — {len(_content_cache)}/{MAX_CACHE_SIZE}")

        return {
            **result,
            "cache": "miss",
            "content_hash": content_hash[:16],
        }
    finally:
        os.unlink(tmp_path)


# ── Entry Point ────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    def handle_sigterm(signum, frame):
        logger.info("SIGTERM received, shutting down...")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_sigterm)

    logger.info(f"Starting MLX Vision OCR Sidecar on port {PORT} (ocr-only mode)")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
