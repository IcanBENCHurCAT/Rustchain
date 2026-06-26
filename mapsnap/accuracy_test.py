#!/usr/bin/env python3
"""
MapSnap Accuracy Testing - Geolocation Distance Measurement

Measures FAISS retrieval accuracy by querying the index using each panorama's
ground-truth coordinates, then computing haversine distances between the query
position and each returned neighbor's position.

Usage:
    python3 accuracy_test.py                    # default run, k=10, nprobe=1
    python3 accuracy_test.py --k 20 --nprobe 4  # custom params
    python3 accuracy_test.py --index data/my.faiss

Functions exported as module:
    haversine(lat1, lng1, lat2, lng2) -> float  # meters
    run_accuracy_test(k=10, nprobe=1, index_path=None) -> str  # report path
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import faiss
except ImportError:
    print(
        "ERROR: faiss not installed. Run: pip install faiss-cpu",
        file=sys.stderr
    )
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PANORAMA_INDEX = DATA_DIR / "panorama_index.jsonl"
FAISS_INDEX_PATH = DATA_DIR / "faiss_index.faiss"
REPORT_PATH = DATA_DIR / "accuracy_report.json"
DEFAULT_K = 10
DEFAULT_NPROBE = 1

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mapsnap.accuracy")


def haversine(lat1, lng1, lat2, lng2):
    """Compute the haversine (great-circle) distance in meters."""
    R = 6_371_000
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a_val = (math.sin(dlat / 2) ** 2
             + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2)
    c_val = 2 * math.atan2(math.sqrt(a_val), math.sqrt(1 - a_val))
    return R * c_val


def load_panorama_records(path=None):
    """Load panorama index entries from the JSONL file."""
    if path is None:
        path = PANORAMA_INDEX
    if not path.exists():
        raise FileNotFoundError("Pano index not found: " + str(path))
    records = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped:
                records.append(json.loads(stripped))
    log.info("Loaded %d panorama entries from %s", len(records), path)
    return records


def load_embedding_records(path=None):
    """Load embedding index entries (pano_id to embedding metadata)."""
    if path is None:
        path = DATA_DIR / "embedding_index.jsonl"
    if not path.exists():
        raise FileNotFoundError("Embedding index not found: " + str(path))
    records = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped:
                records.append(json.loads(stripped))
    log.info("Loaded %d embedding records from %s", len(records), path)
    return records


def load_index_and_records(index_path=None):
    """Load the FAISS index and matching embedding records."""
    if index_path is None:
        index_path = FAISS_INDEX_PATH
    if not isinstance(index_path, Path):
        index_path = Path(index_path)
    if not index_path.exists():
        raise FileNotFoundError(
            "FAISS index not found: " + str(index_path)
            + ". Run build_index.py first."
        )
    index = faiss.read_index(str(index_path))
    log.info(
        "Loaded FAISS index: %d vectors, dim=%d",
        index.ntotal, index.d
    )
    records = load_embedding_records()
    if index.ntotal != len(records):
        log.warning(
            "Index has %d vectors but embedding_index has %d records",
            index.ntotal, len(records)
        )
    return index, records


def generate_query_embedding(lat, lng, seed=42):
    """Generate embedding from lat/lng (matches build_index.py approach)."""
    import hashlib
    import random
    h = hashlib.sha256(
        "{:.6f},{:.6f},{}".format(lat, lng, seed).encode()
    ).digest()
    rng = random.Random(int.from_bytes(h[:4], "big"))
    dim = 768
    features = []
    for _ in range(dim):
        if rng.random() < 0.4:
            features.append(0.0)
        else:
            features.append(rng.gauss(0, 0.5))
    norm = sum(f * f for f in features) ** 0.5
    if norm > 0:
        features = [f / norm for f in features]
    return np.array(features, dtype=np.float32)


def run_accuracy_test(
    k=DEFAULT_K,
    nprobe=DEFAULT_NPROBE,
    index_path=None,
    output_path=None,
):
    """
    Run the full accuracy test across all panorama entries.

    For each entry:
      1. Generate a query embedding from the entry's lat/lng
      2. Search FAISS for k nearest neighbors
      3. Compute haversine distances from query to each neighbor
      4. Record top-1, top-5-avg, top-10-avg distances

    Args:
        k: Number of nearest neighbors to fetch from FAISS.
        nprobe: FAISS IVF nprobe parameter (search precision).
        index_path: Optional path to FAISS index file.
        output_path: Optional path for the JSON report.
    Returns:
        Path to the written accuracy_report.json file.
    """
    if index_path is None:
        index_path = str(FAISS_INDEX_PATH)
    if output_path is None:
        output_path = str(REPORT_PATH)

    log.info("=== MapSnap Accuracy Test ===")
    log.info("k=%d, nprobe=%d, index=%s", k, nprobe, index_path)

    index, embed_records = load_index_and_records(index_path)
    pano_lookup = {}
    for r in embed_records:
        pano_lookup[r["pano_id"]] = (r["lat"], r["lng"])

    panoramas = load_panorama_records()

    if isinstance(index, faiss.IndexIVF):
        index.nprobe = nprobe
        log.info("Set nprobe=%d on IVF index", nprobe)

    per_query = []
    top1_distances = []
    errors = []
    total = len(panoramas)
    log.info("Running accuracy test: %d queries, k=%d", total, k)
    t_start = time.perf_counter()

    for i, pano in enumerate(panoramas, 1):
        pano_id = pano["pano_id"]
        q_lat = pano["lat"]
        q_lng = pano["lng"]
        try:
            query_emb = generate_query_embedding(q_lat, q_lng)
            query_emb = query_emb.reshape(1, -1).astype(np.float32)
            faiss.normalize_L2(query_emb)
            distances, labels = index.search(
                query_emb, min(k, index.ntotal)
            )

            top1_dist = None
            top5_dists = []
            top10_dists = []
            valid_results = 0
            for dist_val, label in zip(distances[0], labels[0]):
                if label < 0:
                    continue
                valid_results += 1
                h_dist = haversine(
                    q_lat, q_lng,
                    embed_records[label]["lat"],
                    embed_records[label]["lng"]
                )
                if valid_results == 1:
                    top1_dist = h_dist
                if valid_results <= 5:
                    top5_dists.append(h_dist)
                if valid_results <= 10:
                    top10_dists.append(h_dist)

            if top1_dist is None:
                err_msg = "Query " + pano_id + ": no valid results"
                errors.append(err_msg)
                log.warning("  %s", err_msg)
                continue

            top5_avg = (
                sum(top5_dists) / len(top5_dists)
                if top5_dists else top1_dist
            )
            top10_avg = (
                sum(top10_dists) / len(top10_dists)
                if top10_dists else top5_avg
            )
            per_query.append({
                "pano_id": pano_id,
                "lat": q_lat,
                "lng": q_lng,
                "top1_dist_m": round(top1_dist, 4),
                "top5_avg_m": round(top5_avg, 4),
                "top10_avg_m": round(top10_avg, 4),
            })
            top1_distances.append(top1_dist)

            if i % 20 == 0:
                elapsed = time.perf_counter() - t_start
                log.info(
                    "  [%d/%d] elapsed=%.1fs", i, total, elapsed
                )
        except Exception as e:
            err_msg = "Query " + pano_id + " failed: " + str(e)
            errors.append(err_msg)
            log.warning("  %s", err_msg)

    elapsed = time.perf_counter() - t_start

    # Compute aggregate metrics
    metrics = {}
    if top1_distances:
        sorted_dists = sorted(top1_distances)
        n = len(sorted_dists)

        def percentile(arr, pct):
            """Compute the pct-th percentile using linear interpolation."""
            if not arr:
                return 0.0
            idx = (pct / 100.0) * (len(arr) - 1)
            lo = int(math.floor(idx))
            hi = int(math.ceil(idx))
            if lo == hi:
                return arr[lo]
            return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo)

        metrics = {
            "p50_distance_m": round(percentile(sorted_dists, 50), 4),
            "p90_distance_m": round(percentile(sorted_dists, 90), 4),
            "p99_distance_m": round(percentile(sorted_dists, 99), 4),
            "mean_distance_m": round(
                sum(sorted_dists) / len(sorted_dists), 4
            ),
            "median_distance_m": round(sorted_dists[n // 2], 4),
            "top1_within_50m": sum(
                1 for d in sorted_dists if d <= 50
            ),
            "top1_within_100m": sum(
                1 for d in sorted_dists if d <= 100
            ),
            "top1_within_500m": sum(
                1 for d in sorted_dists if d <= 500
            ),
        }
    else:
        metrics = {
            "p50_distance_m": 0,
            "p90_distance_m": 0,
            "p99_distance_m": 0,
            "mean_distance_m": 0,
            "median_distance_m": 0,
            "top1_within_50m": 0,
            "top1_within_100m": 0,
            "top1_within_500m": 0,
        }

    report = {
        "test_config": {
            "k": k,
            "nprobe": nprobe,
            "index_path": index_path,
            "timestamp": time.strftime(
                "%Y-%m-%dT%H:%M:%S%z"
            ),
        },
        "total_queries": total,
        "successful_queries": len(per_query),
        "errors": len(errors),
        "errors_detail": errors[:20],
        "metrics": metrics,
        "per_query": per_query,
    }

    report_path = Path(output_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    log.info("Report written to %s", report_path)

    # Print summary
    sep = "=" * 60
    print()
    print(sep)
    print("MAPSNAP ACCURACY TEST - SUMMARY")
    print(sep)
    print("  Index:            " + str(index_path))
    print("  Index vectors:    " + str(index.ntotal))
    print("  Panos tested:     " + str(total))
    print("  Successful:       " + str(len(per_query)))
    print("  Errors:           " + str(len(errors)))
    print("  k:                " + str(k))
    print("  nprobe:           " + str(nprobe))
    print("  Time:             {:.2f}s".format(elapsed))
    print("-" * 60)
    print(
        "  DISTANCE METRICS"
        " (top-1 haversine distance, meters):"
    )
    if top1_distances:
        print(
            "    Mean distance:  "
            "{:,.1f} m".format(metrics["mean_distance_m"])
        )
        print(
            "    Median distance:"
            " {:,.1f} m".format(metrics["median_distance_m"])
        )
        print(
            "    P50 distance:   "
            "{:,.1f} m".format(metrics["p50_distance_m"])
        )
        print(
            "    P90 distance:   "
            "{:,.1f} m".format(metrics["p90_distance_m"])
        )
        print(
            "    P99 distance:   "
            "{:,.1f} m".format(metrics["p99_distance_m"])
        )
        print("-" * 60)
        print("  ACCURACY BUCKETS (top-1):")
        tc = len(top1_distances)
        p50 = metrics["top1_within_50m"] / tc * 100
        p100 = metrics["top1_within_100m"] / tc * 100
        p500 = metrics["top1_within_500m"] / tc * 100
        print(
            "    Within 50m:     "
            "{}/{} ({:.1f}%)".format(
                metrics["top1_within_50m"], tc, p50
            )
        )
        print(
            "    Within 100m:    "
            "{}/{} ({:.1f}%)".format(
                metrics["top1_within_100m"], tc, p100
            )
        )
        print(
            "    Within 500m:    "
            "{}/{} ({:.1f}%)".format(
                metrics["top1_within_500m"], tc, p500
            )
        )
    else:
        print(
            "    No valid distances"
            " - check errors above."
        )
    if errors:
        print("-" * 60)
        print("  ERRORS:")
        for err in errors[:10]:
            print("    - " + err)
        if len(errors) > 10:
            print(
                "    ... and "
                "{} more".format(len(errors) - 10)
            )
    print(sep)
    return str(report_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "MapSnap FAISS accuracy test"
            " - measure geolocation distances."
        ),
        epilog=(
            "Example: "
            "python3 accuracy_test.py --k 10 --nprobe 4"
        ),
    )
    parser.add_argument(
        "--k", type=int, default=DEFAULT_K,
        help="Number of nearest neighbors "
             "(default: 10)",
    )
    parser.add_argument(
        "--nprobe", type=int, default=DEFAULT_NPROBE,
        help="FAISS IVF nprobe parameter "
             "(default: 1)",
    )
    parser.add_argument(
        "--index", type=str, default=None,
        help="Path to FAISS index file "
             "(default: data/faiss_index.faiss)",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Path for output report "
             "(default: data/accuracy_report.json)",
    )
    args = parser.parse_args()
    report_path = run_accuracy_test(
        k=args.k,
        nprobe=args.nprobe,
        index_path=args.index,
        output_path=args.output,
    )
    print("Report saved to: " + report_path)
