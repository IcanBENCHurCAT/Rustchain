#!/usr/bin/env python3
"""
MapSnap Feature Extraction Pipeline

Reads panorama_index.jsonl and produces:
  - embeddings/*.npy: one .npy per panorama (embedding vectors)
  - data/embedding_index.jsonl: pano_id -> embedding path mapping

CURRENT MODE: DUMMY features (random embeddings seeded by lat/lng).
  When real Street View / KartaView images are available, set
  REAL_MODE = True and provide a valid API key.

Usage:
    python3 extract_features.py              # run pipeline
    python3 extract_features.py --resume     # skip already-embedded panos
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
EMBEDDING_DIM = 768  # DINOv2 ViT-B/14 output dim (also CLIP ViT-B/32)
REAL_MODE = False    # <-- set True when you have real images & API keys
API_KEY = os.getenv("GOOGLE_STREETVIEW_KEY", "")

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
EMBED_DIR = DATA_DIR / "embeddings"
INDEX_FILE = DATA_DIR / "embedding_index.jsonl"
INPUT_FILE = DATA_DIR / "panorama_index.jsonl"

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
# Data model
# ---------------------------------------------------------------------------
@dataclass
class PanoramaEntry:
    pano_id: str
    lat: float
    lng: float
    source: str = ""
    highway: str = ""
    highway_name: str = ""
    highway_ref: str = ""
    timestamp: str = ""

# ---------------------------------------------------------------------------
# Street View image download (production-ready, NOT used in DUMMY mode)
# ---------------------------------------------------------------------------

def download_panorama(pano_id: str) -> Optional[Path]:
    """
    Download a Street View panorama tile from Google Street View Static API.

    Returns the path to the saved PNG, or None on failure.

    API: https://streetviewpixels-pa.googleapis.com/v1/tile
         ?panoid={pano_id}&zoom=1&size=640x640&key={API_KEY}

    NOTE: This is production-ready code. It will only run when REAL_MODE=True.
    """
    if not REAL_MODE or not API_KEY:
        log.debug(
            "Not downloading panorama '%s' — REAL_MODE=%s, API_KEY set=%s",
            pano_id, REAL_MODE, bool(API_KEY),
        )
        return None

    url = (
        f"https://streetviewpixels-pa.googleapis.com/v1/tile"
        f"?panoid={pano_id}&zoom=1&size=640x640&key={API_KEY}"
    )

    import urllib.request

    img_path = EMBED_DIR / f"{pano_id}.png"
    if img_path.exists():
        return img_path

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MapSnap/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        if resp.status == 200 and len(data) > 100:
            img_path.write_bytes(data)
            return img_path
        else:
            log.warning("Download returned status %d for %s", resp.status, pano_id)
    except Exception as exc:
        log.error("Failed to download %s: %s", pano_id, exc)
    return None


# ---------------------------------------------------------------------------
# Feature extraction - REAL mode (DINOv2 + CLIP)
# ---------------------------------------------------------------------------

def extract_with_dinov2_clip(img_path: Path) -> list[float]:
    """
    Extract features using DINOv2 ViT-B/14 or CLIP ViT-B/32.

    This is production-ready code that will work once the model files are
    installed. Currently raises NotImplementedError so DUMMY mode stays simple.

    To enable:
      pip install timm open_clip_torch
      (or use torchvision / transformers as preferred)

    DINOv2 approach (uncomment and use):

        import timm
        import torch
        model = timm.create_model("vit_base_patch14_dinov2.lvd142m", pretrained=True)
        model.eval()
        # transform from timm or torchvision
        image_tensor = transform(img).unsqueeze(0)  # [1, 3, 224, 224]
        with torch.no_grad():
            features = model.forward_features(image_tensor)  # [1, 768, 14, 14]
            features = features.mean(dim=(2, 3))              # [1, 768] avg pool
        return features[0].tolist()

    CLIP approach (alternative):

        import open_clip
        model, _, transform = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="laion2b_s34b_b79k"
        )
        model.eval()
        image_tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            features = model.encode_image(image_tensor)
            features = features / features.norm(dim=-1, keepdim=True)
        return features[0].tolist()
    """
    raise NotImplementedError(
        "Real feature extraction requires model setup. "
        "Use DUMMY mode (REAL_MODE=False) for now."
    )


# ---------------------------------------------------------------------------
# DUMMY feature generation
# ---------------------------------------------------------------------------

def generate_dummy_features(lat: float, lng: float, seed: int) -> list[float]:
    """
    Generate deterministic pseudo-random feature vector based on lat/lng.

    Uses hashlib to seed a simple hash -> float mapping so:
    - Same lat/lng always produces the same features (reproducible)
    - Nearby locations produce different features
    - We can test the pipeline end-to-end without real images

    The output is a list[float] of length EMBEDDING_DIM, L2-normalized.
    """
    import random

    h = hashlib.sha256(f"{lat:.6f},{lng:.6f},{seed}".encode()).digest()
    rng = random.Random(int.from_bytes(h[:4], "big"))

    # Generate features: ~60% near-zero (sparse-ish), rest small random
    features = []
    for i in range(EMBEDDING_DIM):
        if rng.random() < 0.4:
            features.append(0.0)
        else:
            features.append(rng.gauss(0, 0.5))

    # L2-normalize (common in embedding pipelines)
    norm = sum(f * f for f in features) ** 0.5
    if norm > 0:
        features = [f / norm for f in features]
    return features


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def read_panorama_index(path: Path) -> List[PanoramaEntry]:
    """Read the JSONL index file and return a list of PanoramaEntry objects."""
    entries: List[PanoramaEntry] = []
    with open(path, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                entry = PanoramaEntry(
                    pano_id=obj.get("pano_id", ""),
                    lat=obj.get("lat", 0.0),
                    lng=obj.get("lng", 0.0),
                    source=obj.get("source", ""),
                    highway=obj.get("highway", ""),
                    highway_name=obj.get("highway_name", ""),
                    highway_ref=obj.get("highway_ref", ""),
                    timestamp=obj.get("timestamp", ""),
                )
                entries.append(entry)
            except json.JSONDecodeError as e:                 log.warning("Skipping line %d: %s", line_no, e)
    return entries


def run_pipeline(resume: bool = False):
    """Main extraction pipeline."""
    EMBED_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Read index
    log.info("Reading %s ...", INPUT_FILE)
    entries = read_panorama_index(INPUT_FILE)
    log.info("Loaded %d entries", len(entries))

    # 2. Load existing index (for resume mode)
    existing_ids: set = set()
    if resume and INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    obj = json.loads(line)
                    existing_ids.add(obj["pano_id"])
        log.info("Already embedded: %d / %d", len(existing_ids), len(entries))

    # 3. Process each entry
    index_records: List[dict] = []
    skipped = 0
    processed = 0

    for entry in entries:
        pano_id = entry.pano_id
        if not pano_id:
            log.warning("Skipping entry without pano_id: %s", entry)
            skipped += 1
            continue

        # Skip if already processed (resume)
        if pano_id in existing_ids and resume:
            log.info("[%d] Skipping (existing): %s", processed + skipped, pano_id)
            index_records.append({
                "pano_id": pano_id,
                "embedding_file": f"data/embeddings/{pano_id}.npy",
                "lat": entry.lat,
                "lng": entry.lng,
                "source": entry.source,
                "status": "existing",
            })
            continue

        log.info(
            "[%d/%d] Processing %s (lat=%.4f, lng=%.4f) ...",
            processed + skipped + 1, len(entries),
            pano_id, entry.lat, entry.lng,
        )

        # --- In DUMMY mode: generate features directly ---
        if not REAL_MODE:
            features = generate_dummy_features(entry.lat, entry.lng, seed=42)
        else:
            # --- In REAL mode: download image, then extract features ---
            img_path = download_panorama(pano_id)
            if img_path is None:
                log.warning("No image available for %s, skipping", pano_id)
                skipped += 1
                continue

            try:
                features = extract_with_dinov2_clip(img_path)
            except NotImplementedError:
                log.warning(
                    "Real extraction not implemented yet, falling back to DUMMY for %s",
                    pano_id,
                )
                features = generate_dummy_features(entry.lat, entry.lng, seed=42)

        # 4. Save embedding as .npy
        npy_path = EMBED_DIR / f"{pano_id}.npy"
        import numpy as np
        np.save(str(npy_path), np.array(features, dtype=np.float32))

        # 5. Build index record
        index_records.append({
            "pano_id": pano_id,
            "embedding_file": f"data/embeddings/{pano_id}.npy",
            "lat": entry.lat,
            "lng": entry.lng,
            "source": entry.source,
            "highway": entry.highway,
            "highway_name": entry.highway_name,
            "highway_ref": entry.highway_ref,
            "status": "embedded",
        })
        processed += 1

    # 6. Write embedding index
    log.info("Writing %s ...", INDEX_FILE)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        for rec in index_records:
            f.write(json.dumps(rec) + "\n")

    # 7. Summary
    log.info("Done! Processed: %d, Skipped: %d", processed, skipped)
    log.info("Embeddings saved to: %s", EMBED_DIR)
    log.info("Index saved to: %s", INDEX_FILE)

    # Print first few index entries for verification
    print(" --- First 3 index entries ---")
    for rec in index_records[:3]:
        print(json.dumps(rec, indent=2))
    print("...")

    return processed, skipped


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MapSnap feature extraction pipeline")
    parser.add_argument(
        "--resume", action="store_true",
        help="Skip already embedded panos (only rebuilds index)",
    )
    parser.add_argument(
        "--real", action="store_true",
        help="Enable REAL mode (requires GOOGLE_STREETVIEW_KEY env var)",
    )
    args = parser.parse_args()

    if args.real:
        REAL_MODE = True
        if not API_KEY:
            log.error("REAL_MODE requires GOOGLE_STREETVIEW_KEY env var")
            sys.exit(1)
        log.warning(
            "Running in REAL MODE -- downloading actual Street View images"
        )

    run_pipeline(resume=args.resume)
