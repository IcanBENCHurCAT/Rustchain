#!/usr/bin/env python3
"""
MapSnap Failure Mode Analysis

Reads accuracy_report.json and categorizes failures by mode:
  - excellent: perfect or near-perfect matches (<=20m)
  - good: correct matches (20-50m)
  - fair: moderate matches (50-100m)
  - interior: generic buildings (turning_circle with no features)
  - road_segment: road segment matches (not precise enough)
  - clustering: multiple nearby turns/junctions confused
  - far_mismatch: large distance errors (>500m)

Usage:
    python3 fail_analysis.py
    python3 fail_analysis.py --report data/my_report.json

Functions exported as module:
    classify_failure(pano, dist_m, pano_meta) -> str
    run_analysis(report_path=None) -> str  # output path
"""

from __future__ import annotations

import argparse
import json
import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mapsnap.fail")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
REPORT_PATH = DATA_DIR / "accuracy_report.json"
OUTPUT_PATH = DATA_DIR / "failure_modes.json"

# Distance thresholds for failure mode classification
EXCELLENT_DIST = 20
GOOD_DIST = 50
FAIR_DIST = 100
POOR_DIST = 500


def haversine(lat1, lng1, lat2, lng2):
    """Compute haversine distance in meters."""
    R = 6_371_000
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a_val = (math.sin(dlat / 2) ** 2
             + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a_val), math.sqrt(1 - a_val))


def load_panorama_metadata():
    """Load panorama_index.jsonl for highway type metadata."""
    path = DATA_DIR / "panorama_index.jsonl"
    meta = {}
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped:
                rec = json.loads(stripped)
                meta[rec["pano_id"]] = rec
    return meta


def load_report(path=None):
    """Load the accuracy_report.json file."""
    path = path or str(REPORT_PATH)
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def classify_failure(pano, dist_m, pano_meta=None):
    """
    Classify a failure into a named mode based on distance and pano metadata.

    Args:
        pano: per_query entry with pano_id, lat, lng
        dist_m: top-1 haversine distance in meters
        pano_meta: optional panorama metadata dict (from panorama_index.jsonl)

    Returns:
        One of: excellent, good, fair, interior, road_segment,
                clustering, far_mismatch
    """
    if pano_meta is None:
        pano_meta = {}
    meta = pano_meta.get(pano["pano_id"], {})
    highway = meta.get("highway", "")
    source = meta.get("source", "")

    # Always check distance first for perfect/near-perfect matches
    if dist_m <= EXCELLENT_DIST:
        return "excellent"
    if dist_m <= GOOD_DIST:
        return "good"
    if dist_m <= FAIR_DIST:
        return "fair"

    # Interior / generic buildings
    if highway == "turning_circle":
        return "interior"

    # Road segments (motorway_junction, etc.)
    if highway in ("motorway_junction", "traffic_signals", "crossing"):
        return "road_segment"

    # Clustering: nearby turns
    if highway == "turning_circle":
        return "clustering"

    # Large distance errors
    if dist_m > POOR_DIST:
        return "far_mismatch"

    return "poor"


def run_analysis(report_path=None):
    """
    Read accuracy report and categorize failures by mode.

    Args:
        report_path: Path to accuracy_report.json

    Returns:
        Path to the output failure_modes.json file.
    """
    report = load_report(report_path)
    pano_meta = load_panorama_metadata()
    per_query = report.get("per_query", [])

    # Categorize each query
    categories = {
        "excellent": [],
        "good": [],
        "fair": [],
        "interior": [],
        "road_segment": [],
        "clustering": [],
        "far_mismatch": [],
        "poor": [],
    }

    for entry in per_query:
        mode = classify_failure(
            entry, entry["top1_dist_m"], pano_meta
        )
        categories[mode].append({
            "pano_id": entry["pano_id"],
            "lat": entry["lat"],
            "lng": entry["lng"],
            "top1_dist_m": entry["top1_dist_m"],
            "top5_avg_m": entry["top5_avg_m"],
            "top10_avg_m": entry["top10_avg_m"],
            "highway": pano_meta.get(
                entry["pano_id"], {}
            ).get("highway", ""),
            "source": pano_meta.get(
                entry["pano_id"], {}
            ).get("source", ""),
        })

    # Build summary
    total = len(per_query)
    summary = {}
    for mode, entries in categories.items():
        dists = [e["top1_dist_m"] for e in entries]
        summary[mode] = {
            "count": len(entries),
            "percentage": round(
                len(entries) / total * 100, 1
            ) if total else 0,
            "mean_dist_m": round(
                sum(dists) / len(dists), 2
            ) if dists else 0,
            "max_dist_m": round(
                max(dists), 2
            ) if dists else 0,
            "min_dist_m": round(
                min(dists), 2
            ) if dists else 0,
        }

    # Build output
    output = {
        "input_report": str(REPORT_PATH),
        "total_queries": total,
        "successful_queries": len(per_query),
        "failure_modes": summary,
        "by_mode": {
            mode: entries for mode, entries
            in categories.items()
        },
    }

    # Write output
    output_path = OUTPUT_PATH
    output_path.parent.mkdir(
        parents=True, exist_ok=True
    )
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2)
    log.info("Written: %s", output_path)

    # Print summary
    sep = "=" * 60
    print()
    print(sep)
    print("MAPSNAP FAILURE MODE ANALYSIS")
    print(sep)
    print(
        "  Total queries:  "
        "{}".format(total)
    )
    print(
        "  Successful:     "
        "{}".format(len(per_query))
    )
    print("-" * 60)
    print(
        "  MODE               COUNT     PCT     "
        "MEAN_DIST"
    )
    print("-" * 60)
    for mode in [
        "excellent", "good", "fair",
        "interior", "road_segment",
        "clustering", "far_mismatch", "poor"
    ]:
        info = summary[mode]
        print(
            "  {:16s}  {:5d}  {:5.1f}%  "
            "{:10.1f}m".format(
                mode,
                info["count"],
                info["percentage"],
                info["mean_dist_m"],
            )
        )
    print("-" * 60)
    print(
        "  Written to: "
        "{}".format(output_path)
    )
    print(sep)
    return str(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "MapSnap failure mode analysis - "
            "categorize retrieval errors."
        ),
    )
    parser.add_argument(
        "--report", type=str, default=None,
        help="Path to accuracy_report.json "
             "(default: data/accuracy_report.json)",
    )
    args = parser.parse_args()
    output_path = run_analysis(
        report_path=args.report
    )
    print("Output saved to: " + output_path)
