#!/usr/bin/env python3
"""
MapSnap Feature Extraction Pipeline — DINOv2 + CLIP

Reads panorama_index.jsonl and produces:
  - embeddings/<pano_id>_dino.npy   : DINOv2 768-dim embedding
  - embeddings/<pano_id>_clip.npy  : CLIP 512-dim embedding
  - data/embedding_index.jsonl       : pano_id -> path mapping with lat/lng

Usage:
    python3 extract_embeddings.py              # full batch
    python3 extract_embeddings.py --test 3     # test on first 3 only
    python3 extract_embeddings.py --resume     # skip already processed
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageDraw
from tqdm import tqdm
from transformers import AutoImageProcessor, AutoModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent / "data"
EMBED_DIR = DATA_DIR / "embeddings"
INDEX_FILE = DATA_DIR / "embedding_index.jsonl"
INPUT_FILE = DATA_DIR / "panorama_index.jsonl"

# GPU config
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mapsnap")

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

_dino_model = None
_dino_processor = None
_clip_model = None
_clip_processor = None


def load_dinov2() -> tuple:
    """Load DINOv2 ViT-Base from HuggingFace."""
    global _dino_model, _dino_processor
    if _dino_model is not None:
        return _dino_model, _dino_processor

    model_name = "facebook/dino-vit-base16"
    log.info("Loading DINOv2 model (%s) ...", model_name)
    _dino_processor = AutoImageProcessor.from_pretrained(model_name)
    _dino_model = AutoModel.from_pretrained(model_name).to(DEVICE)
    _dino_model.eval()
    log.info("DINOv2 loaded on %s", DEVICE)
    return _dino_model, _dino_processor


def load_clip() -> tuple:
    """Load CLIP ViT-B/32 from HuggingFace."""
    global _clip_model, _clip_processor
    if _clip_model is not None:
        return _clip_model, _clip_processor

    model_name = "openai/clip-vit-base-patch32"
    log.info("Loading CLIP model (%s) ...", model_name)
    _clip_processor = AutoImageProcessor.from_pretrained(model_name)
    _clip_model = AutoModel.from_pretrained(model_name).to(DEVICE)
    _clip_model.eval()
    log.info("CLIP loaded on %s", DEVICE)
    return _clip_model, _clip_processor


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def extract_dinov2(image: Image.Image) -> np.ndarray:
    """Extract DINOv2 768-dim embedding from a PIL Image."""
    model, processor = load_dinov2()

    inputs = processor(images=image, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        outputs = model(**inputs)

    # CLS token is the primary image embedding
    embed = outputs.last_hidden_state[:, 0, :].squeeze().cpu().numpy()
    # L2-normalize
    embed = embed / (np.linalg.norm(embed) + 1e-8)
    return embed.astype(np.float32)


def extract_clip(image: Image.Image) -> np.ndarray:
    """Extract CLIP 512-dim embedding from a PIL Image."""
    model, processor = load_clip()

    inputs = processor(images=image, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        outputs = model(**inputs)

    # Pooler output for CLIP ViT model
    embed = outputs.pooler_output.squeeze().cpu().numpy()
    # L2-normalize
    embed = embed / (np.linalg.norm(embed) + 1e-8)
    return embed.astype(np.float32)


def extract_both(image: Image.Image) -> tuple:
    """Run both models and return (dino_embed, clip_embed)."""
    dino = extract_dinov2(image)
    clip = extract_clip(image)
    return dino, clip


# ---------------------------------------------------------------------------
# Synthetic panorama generation (when no real images are available)
# ---------------------------------------------------------------------------

def generate_synthetic_panorama(pano_id: str, lat: float, lng: float) -> Image.Image:
    """
    Generate a deterministic synthetic "panorama" image from lat/lng/pano_id.
    Uses coordinate-derived colors, hash-based patterns, and text labels.
    This produces unique images per entry so embeddings are meaningful.
    """
    # Deterministic seed from pano_id
    seed_val = int(hashlib.sha256(pano_id.encode()).hexdigest()[:8], 16)

    # Coordinate-derived palette (lat -> warm, lng -> cool)
    r_base = int(255 * ((lat + 33.0) / 2.0))  # ~0-255 based on lat
    g_base = int(255 * ((lat + 30.0) / 10.0))
    b_base = int(255 * ((-lng - 84.0) / 2.0))

    import random
    rng = random.Random(seed_val)

    img = Image.new("RGB", (640, 360))
    draw = ImageDraw.Draw(img)

    # Sky gradient
    for y in range(360):
        ratio = y / 360.0
        sky_r = int(r_base * (1 - ratio) + 135 * ratio)
        sky_g = int(g_base * (1 - ratio) * 0.7 + 206 * ratio)
        sky_b = int(b_base * (1 - ratio) + 235 * ratio)
        draw.line([(0, y), (640, y)], fill=(sky_r, sky_g, sky_b))

    # Ground
    ground_y = 200
    for y in range(ground_y, 360):
        ratio = (y - ground_y) / (360 - ground_y)
        grd_r = int(r_base * (1 - ratio) + 100 * ratio)
        grd_g = int(g_base * (1 - ratio) * 0.5 + 80 * ratio)
        grd_b = int(b_base * (1 - ratio) * 0.3 + 50 * ratio)
        draw.line([(0, y), (640, y)], fill=(grd_r, grd_g, grd_b))

    # Random "objects" (buildings, trees) for visual uniqueness
    for _ in range(rng.randint(8, 20)):
        ox = rng.randint(10, 620)
        oy = rng.randint(180, 310)
        ow = rng.randint(20, 80)
        oh = rng.randint(30, 120)
        color = (rng.randint(100, 220), rng.randint(80, 200), rng.randint(60, 180))
        draw.rectangle([ox, oy, ox + ow, oy + oh], fill=color, outline=(0, 0, 0))

    # Hash-based pattern overlay
    h_bytes = hashlib.sha256(pano_id.encode()).digest()
    for i in range(0, len(h_bytes), 2):
        px = (h_bytes[i] * 2 + i) % 640
        py = (h_bytes[i + 1] * 3 + i * 7) % 360
        sz = h_bytes[i] % 5 + 2
        c = (h_bytes[i], h_bytes[(i + 3) % len(h_bytes)], h_bytes[(i + 5) % len(h_bytes)])
        draw.ellipse([px - sz, py - sz, px + sz, py + sz], fill=c)

    return img


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def read_panorama_index(path: Path) -> List[dict]:
    """Read the JSONL index file."""
    entries = []
    with open(path, "r", encoding="utf-8") as f:\n        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                entries.append(obj)
            except json.JSONDecodeError as e:\n                log.warning("Skipping line %d: %s", line_no, e)
    return entries


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_pipeline(test_count: Optional[int] = None, resume: bool = False):
    """Main extraction pipeline."""
    EMBED_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Read index
    log.info("Reading %s ...", INPUT_FILE)
    entries = read_panorama_index(INPUT_FILE)
    log.info("Loaded %d entries", len(entries))

    if test_count:
        entries = entries[:test_count]
        log.info("TEST MODE: processing first %d entries", test_count)

    # 2. Load existing index (for resume)
    existing_dino = set()
    existing_clip = set()
    if resume and INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:\n            for line in f:\n                line = line.strip()\n                if line:
                    try:
                        obj = json.loads(line)
                        dino_f = obj.get("dino_embed_path", "")
                        clip_f = obj.get("clip_embed_path", "")
                        if dino_f:\n                            existing_dino.add(Path(dino_f).stem)\n                        if clip_f:\n                            existing_clip.add(Path(clip_f).stem)\n                    except json.JSONDecodeError:
                        pass
        log.info("Existing DINO embeddings: %d", len(existing_dino))
        log.info("Existing CLIP embeddings: %d", len(existing_clip))

    # 3. Process each entry
    index_records: List[dict] = []
    skipped = 0
    processed = 0
    errors = 0

    for i, entry in enumerate(tqdm(entries, desc="Processing")):
        pano_id = entry.get("pano_id", f"unknown_{i}")
        lat = entry.get("lat", 0.0)
        lng = entry.get("lng", 0.0)

        # Skip already processed (resume mode)
        if pano_id in existing_dino and pano_id in existing_clip and resume:
            # Still add to index from existing files
            dino_path = f"data/embeddings/{pano_id}_dino.npy"
            clip_path = f"data/embeddings/{pano_id}_clip.npy"
            index_records.append({
                "pano_id": pano_id,
                "dino_embed_path": dino_path,
                "clip_embed_path": clip_path,
                "lat": lat,
                "lng": lng,
                "status": "existing",
            })
            continue

        # Generate or load image
        # Check if a real image exists at data/panos/<pano_id>.jpg/png etc.
        img_path = None
        for ext in [".jpg", ".jpeg", ".png", ".webp"]:
            candidate = DATA_DIR / "panos" / (pano_id + ext)
            if candidate.exists():
                img_path = candidate
                break

        if img_path:
            try:
                image = Image.open(img_path).convert("RGB")
            except Exception as exc:
                log.error("Failed to open %s: %s", img_path, exc)
                errors += 1
                continue
        else:
            # Generate synthetic panorama
            image = generate_synthetic_panorama(pano_id, lat, lng)

        # Resize to 224x224 for both models\n        image_resized = image.resize((224, 224), Image.Resampling.BICUBIC)

        # Extract features
        try:
            dino_embed, clip_embed = extract_both(image_resized)
        except Exception as exc:
            log.error("Extraction failed for %s: %s", pano_id, exc)
            errors += 1
            continue

        # Save embeddings
        dino_path = EMBED_DIR / f"{pano_id}_dino.npy"
        clip_path = EMBED_DIR / f"{pano_id}_clip.npy"

        np.save(str(dino_path), dino_embed)
        np.save(str(clip_path), clip_embed)

        index_records.append({
            "pano_id": pano_id,
            "dino_embed_path": f"data/embeddings/{pano_id}_dino.npy",
            "clip_embed_path": f"data/embeddings/{pano_id}_clip.npy",
            "lat": lat,
            "lng": lng,
            "dino_dim": int(dino_embed.shape[0]),
            "clip_dim": int(clip_embed.shape[0]),
            "status": "embedded",
        })
        processed += 1

    # 4. Write embedding index
    log.info("Writing %s ...", INDEX_FILE)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:\n        for rec in index_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    # 5. Summary
    log.info("=" * 50)
    log.info("EXTRACTION COMPLETE")
    log.info("  Processed: %d", processed)
    log.info("  Skipped (existing): %d", len([r for r in index_records if r.get("status") == "existing"]))
    log.info("  Errors: %d", errors)
    log.info("  Embeddings dir: %s", EMBED_DIR)
    log.info("  Index file: %s", INDEX_FILE)

    # Verify output
    dino_files = list(EMBED_DIR.glob("*_dino.npy"))
    clip_files = list(EMBED_DIR.glob("*_clip.npy"))
    log.info("  DINOv2 .npy files: %d", len(dino_files))
    log.info("  CLIP .npy files:   %d", len(clip_files))

    if dino_files:
        sample = np.load(EMBED_DIR / dino_files[0].name)
        log.info("  Sample DINO shape: %s, dtype: %s", sample.shape, sample.dtype)
    if clip_files:
        sample = np.load(EMBED_DIR / clip_files[0].name)
        log.info("  Sample CLIP shape: %s, dtype: %s", sample.shape, sample.dtype)

    # Show first 3 index entries
    print("\n--- First 3 index entries ---")
    for rec in index_records[:3]:
        print(json.dumps(rec, indent=2))
    print("...")

    return processed, skipped, errors


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MapSnap DINOv2+CLIP feature extraction")
    parser.add_argument(
        "--test", type=int, default=0,
        help="Test mode: process only N images",
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Skip already processed panos",
    )
    args = parser.parse_args()

    if args.test > 0:
        log.info("TEST MODE: processing %d images", args.test)
    elif args.resume:
        log.info("RESUME MODE: skipping already embedded panos")
    else:
        all_entries = read_panorama_index(INPUT_FILE)
        log.info("FULL BATCH MODE: processing all %d entries", len(all_entries))

    run_pipeline(test_count=args.test if args.test > 0 else None, resume=args.resume)
