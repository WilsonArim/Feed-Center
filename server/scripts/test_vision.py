#!/usr/bin/env -S ~/mlx-env/bin/python3
"""
Sovereign Symbiote — Local Vision Engine Test Script
=====================================================
Uses mlx-vlm to load a pre-quantized Qwen3-VL 8B model
from the mlx-community on HuggingFace and extract data from
a receipt image entirely on-device (Apple Silicon M4 Pro).

IMPORTANT: Requires the arm64 Python venv at ~/mlx-env
  Created with: /opt/homebrew/bin/python3.11 -m venv ~/mlx-env

Model: mlx-community/Qwen3-VL-8B-Instruct-4bit (~5GB RAM)
Hardware: Apple M4 Pro 24GB Unified Memory

Usage:
    source ~/mlx-env/bin/activate
    python server/scripts/test_vision.py /path/to/receipt.jpg
    python server/scripts/test_vision.py /path/to/receipt.png --prompt "What items are listed?"
"""

import sys
import argparse
import time
from pathlib import Path

# ── Model Config ───────────────────────────────────────────────
# 8B 4-bit: ~5GB RAM — comfortable on 24GB M4 Pro
MODEL_ID = "mlx-community/Qwen3-VL-8B-Instruct-4bit"


def main():
    parser = argparse.ArgumentParser(
        description="Extract structured data from an image using local MLX Vision (8B)"
    )
    parser.add_argument(
        "image_path",
        type=str,
        help="Path to a local image file (receipt, invoice, etc.)",
    )
    parser.add_argument(
        "--prompt",
        type=str,
        default=None,
        help="Custom prompt (default: receipt extraction prompt)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=MODEL_ID,
        help=f"HuggingFace model ID (default: {MODEL_ID})",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=512,
        help="Max tokens to generate (default: 512)",
    )
    args = parser.parse_args()

    # ── Validate image ─────────────────────────────────────────
    image_path = Path(args.image_path).resolve()
    if not image_path.is_file():
        print(f"❌ File not found: {image_path}")
        sys.exit(1)

    suffix = image_path.suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}:
        print(f"⚠️  Unusual image format: {suffix}. Proceeding anyway...")

    # ── Build the prompt ───────────────────────────────────────
    default_prompt = (
        "You are a receipt and invoice data extractor for a personal finance app. "
        "Analyze this image carefully and extract the following fields in strict JSON format:\n"
        "{\n"
        '  "merchant": "store or business name",\n'
        '  "total": 0.00,\n'
        '  "currency": "EUR",\n'
        '  "date": "YYYY-MM-DD",\n'
        '  "items": [{"name": "item", "quantity": 1, "price": 0.00}]\n'
        "}\n\n"
        "Rules:\n"
        "- Return ONLY valid JSON. No markdown, no explanation, no code fences.\n"
        "- If a field is not visible, use null.\n"
        "- Amounts must be numbers, not strings.\n"
        "- Default currency is EUR unless clearly stated otherwise."
    )
    prompt = args.prompt or default_prompt

    print("╔══════════════════════════════════════════════════════════╗")
    print("║       SOVEREIGN SYMBIOTE — LOCAL VISION ENGINE          ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    print(f"  🔧 Model:  {args.model}")
    print(f"  📷 Image:  {image_path.name}")
    print(f"  💬 Prompt: {prompt[:60]}...")
    print()

    # ── Load model ─────────────────────────────────────────────
    print("  ⏳ Loading model (first run downloads ~5GB from HuggingFace)...")
    t0 = time.perf_counter()

    try:
        # Patch transformers for Qwen3-VL on MLX (no torchvision needed)
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import patch_transformers  # noqa: F401

        from mlx_vlm import load, generate
        from mlx_vlm.prompt_utils import apply_chat_template
        from mlx_vlm.utils import load_config
    except ImportError:
        print(
            "\n  ❌ mlx-vlm not installed. Run:\n"
            "     python3 -m venv ~/mlx-env\n"
            "     source ~/mlx-env/bin/activate\n"
            "     pip install mlx mlx-lm mlx-vlm\n"
        )
        sys.exit(1)

    model, processor = load(args.model)
    config = load_config(args.model)

    load_time = time.perf_counter() - t0
    print(f"  ✅ Model loaded in {load_time:.1f}s")
    print()

    # ── Build chat and generate ────────────────────────────────
    formatted_prompt = apply_chat_template(
        processor,
        config,
        prompt,
        num_images=1,
    )

    print("  🧠 Generating response...")
    t1 = time.perf_counter()

    output = generate(
        model,
        processor,
        formatted_prompt,
        [str(image_path)],
        max_tokens=args.max_tokens,
        verbose=False,
    )

    gen_time = time.perf_counter() - t1
    print(f"  ⚡ Generated in {gen_time:.1f}s")
    print()

    # ── Output ─────────────────────────────────────────────────
    result_text = output.text if hasattr(output, "text") else str(output)
    print("═" * 60)
    print("  EXTRACTED DATA:")
    print("═" * 60)
    print()
    print(result_text)
    print()
    print("═" * 60)
    tps = getattr(output, "generation_tps", 0)
    peak_mem = getattr(output, "peak_memory", 0)
    stats = f"  📊 Total: {load_time + gen_time:.1f}s  │  Load: {load_time:.1f}s  │  Gen: {gen_time:.1f}s"
    if tps:
        stats += f"  │  {tps:.0f} tok/s"
    if peak_mem:
        stats += f"  │  {peak_mem:.1f}GB RAM"
    print(stats)
    print("═" * 60)


if __name__ == "__main__":
    main()
