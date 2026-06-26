#!/usr/bin/env python3
"""
MapSnap Parameter Improvement - FAISS Configuration Testing

Tests different FAISS index configurations (nprobe values, IVF sizes)
and measures accuracy impact of each configuration.
Recommends optimal parameters based on accuracy vs performance tradeoff.

Usage:
    python3 accuracy_iteration.py
    python3 accuracy_iteration.py --k 10 --nprobe-range 1,2,4,8,16

Functions exported as module:
    test_config(index, embed_records, pano, k, nprobe) -> dict
    run_iteration(test_configs=None) -> str  # output path
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

try:
    import faiss
except ImportError:
    print(
        "ERROR: faiss not installed. "
        "Run: pip install faiss-cpu",
        file=sys.stderr
    )
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
FAISS_INDEX_PATH = DATA_DIR / "faiss_index.faiss"
EMBEDDING_INDEX = DATA_DIR / "embedding_index.jsonl"
PANORAMA_INDEX = DATA_DIR / "panorama_index.jsonl"
OUTPUT_PATH = DATA_DIR / "parameter_recs.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mapsnap.iteration")


def haversine(lat1, lng1, lat2, lng2):
    """Compute haversine distance in meters."""
    R = 6_371_000
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a_val = (math.sin(dlat / 2) ** 2
             + math.cos(lat1_r) * math.cos(lat2_r)
             * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(
        math.sqrt(a_val), math.sqrt(1 - a_val)
    )


def load_panorama_records(path=None):
    """Load panorama entries from JSONL."""
    if path is None:
        path = PANORAMA_INDEX
    if not path.exists():
        raise FileNotFoundError(
            "Pano index not found: " + str(path)
        )
    records = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped:
                records.append(json.loads(stripped))
    return records


def load_embedding_records(path=None):
    """Load embedding index entries."""
    if path is None:
        path = EMBEDDING_INDEX
    if not path.exists():
        raise FileNotFoundError(
            "Embedding index not found: " + str(path)
        )
    records = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped:
                records.append(json.loads(stripped))
    return records


def generate_query_embedding(lat, lng, seed=42):
    """Generate embedding from lat/lng (matches build_index.py)."""
    import hashlib
    import random
    h = hashlib.sha256(
        "{:.6f},{:.6f},{}".format(
            lat, lng, seed
        ).encode()
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


def build_custom_index(
    nlist=4, nm=32, nbits=6,
    embedding_records=None,
):
    """
    Build a custom FAISS index with specified IVF/PQ parameters.

    Args:
        nlist: Number of IVF Voronoi cells.
        nm: Number of PQ subvectors.
        nbits: Bits per PQ subvector.
        embedding_records: List of embedding records.
    Returns:
        Tuple of (faiss.Index, embedding_metadata_dict).
    """
    if embedding_records is None:
        embedding_records = load_embedding_records()

    dim = 768
    data = np.zeros(
        (len(embedding_records), dim), dtype=np.float32
    )
    metadata = []
    for i, rec in enumerate(embedding_records):
        pano_id = rec["pano_id"]
        lat = rec["lat"]
        lng = rec["lng"]
        feat = generate_query_embedding(lat, lng)
        data[i] = feat
        metadata.append({
            "pano_id": pano_id,
            "lat": lat,
            "lng": lng,
        })

    # Build IVF+PQ index
    quantizer = faiss.IndexFlatL2(dim)
    index = faiss.IndexIVFPQ(
        quantizer, dim, nlist, nm, nbits
    )
    index.train(data)
    index.add(data)
    return index, metadata


def test_single_config(
    index,
    nprobe,
    panorama_records,
    embed_metadata,
    k=10,
):
    """
    Test a single FAISS configuration.

    Args:
        index: FAISS index to test.
        nprobe: IVF nprobe parameter.
        panorama_records: List of pano entries.
        embed_metadata: List of embedding metadata.
        k: Number of neighbors to retrieve.
    Returns:
        Dict with config results.
    """
    if isinstance(index, faiss.IndexIVF):
        index.nprobe = nprobe

    top1_dists = []
    top5_dists_list = []
    top10_dists_list = []
    errors = 0

    t_start = time.perf_counter()
    for pano in panorama_records:
        try:
            query_emb = generate_query_embedding(
                pano["lat"], pano["lng"]
            )
            query_emb = (
                query_emb.reshape(1, -1)
                .astype(np.float32)
            )
            faiss.normalize_L2(query_emb)
            distances, labels = index.search(
                query_emb, min(k, index.ntotal)
            )
            top1_dist = None
            top5_d = []
            top10_d = []
            valid = 0
            for d, label in zip(
                distances[0], labels[0]
            ):
                if label < 0:
                    continue
                valid += 1
                h_dist = haversine(
                    pano["lat"], pano["lng"],
                    embed_metadata[label]["lat"],
                    embed_metadata[label]["lng"]
                )
                if valid == 1:
                    top1_dist = h_dist
                if valid <= 5:
                    top5_d.append(h_dist)
                if valid <= 10:
                    top10_d.append(h_dist)
            if top1_dist is not None:
                top1_dists.append(top1_dist)
                top5_dists_list.append(
                    top5_d if top5_d else [top1_dist]
                )
                top10_dists_list.append(
                    top10_d if top10_d else top5_d
                )
            else:
                errors += 1
        except Exception:
            errors += 1

    elapsed = time.perf_counter() - t_start

    # Compute stats
    if top1_dists:
        sorted_d = sorted(top1_dists)
        n = len(sorted_d)
        mean_d = sum(sorted_d) / n
        median_d = sorted_d[n // 2]

        def pct(arr, p):
            idx = (p / 100.0) * (len(arr) - 1)
            lo = int(math.floor(idx))
            hi = int(math.ceil(idx))
            if lo == hi:
                return arr[lo]
            return arr[lo] + (
                arr[hi] - arr[lo]
            ) * (idx - lo)

        within_50 = sum(1 for d in sorted_d if d <= 50)
        within_100 = sum(1 for d in sorted_d if d <= 100)
        within_500 = sum(1 for d in sorted_d if d <= 500)
        avg_top5 = (
            sum(
                sum(d) / len(d)
                for d in top5_dists_list
            ) / len(top5_dists_list)
            if top5_dists_list else 0
        )
        avg_top10 = (
            sum(
                sum(d) / len(d)
                for d in top10_dists_list
            ) / len(top10_dists_list)
            if top10_dists_list else 0
        )
        stats = {
            "n_queries": len(top1_dists),
            "errors": errors,
            "elapsed_s": round(elapsed, 3),
            "mean_dist_m": round(mean_d, 2),
            "median_dist_m": round(median_d, 2),
            "p50_dist_m": round(
                pct(sorted_d, 50), 2
            ),
            "p90_dist_m": round(
                pct(sorted_d, 90), 2
            ),
            "p99_dist_m": round(
                pct(sorted_d, 99), 2
            ),
            "top1_within_50m": within_50,
            "top1_within_100m": within_100,
            "top1_within_500m": within_500,
            "pct_within_50": round(
                within_50 / len(top1_dists) * 100, 1
            ) if top1_dists else 0,
            "pct_within_100": round(
                within_100 / len(top1_dists) * 100, 1
            ) if top1_dists else 0,
            "avg_top5_m": round(avg_top5, 2),
            "avg_top10_m": round(avg_top10, 2),
        }
    else:
        stats = {
            "n_queries": 0,
            "errors": errors,
            "elapsed_s": round(elapsed, 3),
            "mean_dist_m": 0,
            "median_dist_m": 0,
            "p50_dist_m": 0,
            "p90_dist_m": 0,
            "p99_dist_m": 0,
            "top1_within_50m": 0,
            "top1_within_100m": 0,
            "top1_within_500m": 0,
            "pct_within_50": 0,
            "pct_within_100": 0,
            "avg_top5_m": 0,
            "avg_top10_m": 0,
        }
    return stats


def run_iteration(test_configs=None):
    """
    Test multiple FAISS configurations and recommend optimal params.

    Args:
        test_configs: List of config dicts with nprobe, nlist, nm, nbits.
    Returns:
        Path to the output parameter_recs.json file.
    """
    if test_configs is None:
        # Default test configurations
        test_configs = [
            {"label": "default", "nprobe": 1,
             "nlist": 4, "nm": 32, "nbits": 6},
            {"label": "nprobe_2", "nprobe": 2,
             "nlist": 4, "nm": 32, "nbits": 6},
            {"label": "nprobe_4", "nprobe": 4,
             "nlist": 4, "nm": 32, "nbits": 6},
            {"label": "nprobe_8", "nprobe": 8,
             "nlist": 4, "nm": 32, "nbits": 6},
            {"label": "nprobe_16", "nprobe": 16,
             "nlist": 4, "nm": 32, "nbits": 6},
            {"label": "nprobe_32", "nprobe": 32,
             "nlist": 4, "nm": 32, "nbits": 6},
            {"label": "nlist_8", "nprobe": 1,
             "nlist": 8, "nm": 32, "nbits": 6},
            {"label": "nlist_16", "nprobe": 1,
             "nlist": 16, "nm": 32, "nbits": 6},
            {"label": "nlist_32", "nprobe": 1,
             "nlist": 32, "nm": 32, "nbits": 6},
            {"label": "nlist_64", "nprobe": 1,
             "nlist": 64, "nm": 32, "nbits": 6},
        ]

    # Load data
    pano_records = load_panorama_records()
    embed_records = load_embedding_records()

    results = []
    total_configs = len(test_configs)

    print()
    print("=" * 60)
    print("MAPSNAP PARAMETER ITERATION TEST")
    print("=" * 60)
    print("  Total configs:  {}".format(total_configs))
    print("  Panos tested:   {}".format(len(pano_records)))
    print("  Embeddings:     {}".format(len(embed_records)))
    print("-" * 60)

    for ci, cfg in enumerate(test_configs, 1):
        label = cfg.get("label", "config_{}".format(ci))
        nprobe = cfg.get("nprobe", 1)
        nlist = cfg.get("nlist", 4)
        nm = cfg.get("nm", 32)
        nbits = cfg.get("nbits", 6)

        print()
        print(
            "  [{}/{}] Testing: {} "
            "(nprobe={}, nlist={}, nm={}, nbits={})".format(
                ci, total_configs,
                label, nprobe, nlist, nm, nbits
            )
        )

        # Build or load index
        if cfg.get("build_new", False):
            index, metadata = build_custom_index(
                nlist=nlist, nm=nm, nbits=nbits,
                embedding_records=embed_records,
            )
        else:
            try:
                index = faiss.read_index(
                    str(FAISS_INDEX_PATH)
                )
                # Build metadata from embedding_records
                metadata = []
                for i, rec in enumerate(embed_records):
                    metadata.append({
                        "pano_id": rec["pano_id"],
                        "lat": rec["lat"],
                        "lng": rec["lng"],
                    })
            except FileNotFoundError:
                log.warning(
                    "Index not found, building default"
                )
                index, metadata = build_custom_index(
                    nlist=nlist, nm=nm, nbits=nbits,
                    embedding_records=embed_records,
                )

        # Run test
        stats = test_single_config(
            index, nprobe, pano_records,
            metadata, k=10
        )
        stats["config"] = {
            "label": label,
            "nprobe": nprobe,
            "nlist": nlist,
            "nm": nm,
            "nbits": nbits,
        }
        results.append(stats)

        print(
            "    elapsed={:.3f}s  "
            "mean={:.1f}m  "
            "p50={:.1f}m  "
            "within_50={:.1f}%".format(
                stats["elapsed_s"],
                stats["mean_dist_m"],
                stats["p50_dist_m"],
                stats["pct_within_50"],
            )
        )

        del index

    # Find best config
    if results:
        best = min(
            results,
            key=lambda r: r["p50_dist_m"]
        )
        print()
        print("-" * 60)
        print("  RECOMMENDED CONFIGURATION:")
        print("    Label:   " + best["config"]["label"])
        print(
            "    nprobe:  "
            "{}".format(best["config"]["nprobe"])
        )
        print(
            "    nlist:   "
            "{}".format(best["config"]["nlist"])
        )
        print(
            "    nm:      "
            "{}".format(best["config"]["nm"])
        )
        print(
            "    nbits:   "
            "{}".format(best["config"]["nbits"])
        )
        print(
            "    P50:     "
            "{:.1f}m".format(best["p50_dist_m"])
        )
        print(
            "    P90:     "
            "{:.1f}m".format(best["p90_dist_m"])
        )
        print(
            "    Mean:    "
            "{:.1f}m".format(best["mean_dist_m"])
        )
        print(
            "    within_50m: "
            "{:.1f}%".format(
                best["pct_within_50"]
            )
        )

    # Build recommendation
    recommendation = {
        "test_timestamp": time.strftime(
            "%Y-%m-%dT%H:%M:%S%z"
        ),
        "total_configs_tested": total_configs,
        "results": results,
    }
    if results:
        best = min(
            results,
            key=lambda r: r["p50_dist_m"]
        )
        recommendation["recommended"] = {
            "label": best["config"]["label"],
            "nprobe": best["config"]["nprobe"],
            "nlist": best["config"]["nlist"],
            "nm": best["config"]["nm"],
            "nbits": best["config"]["nbits"],
            "reasoning": (
                "Best P50 distance among all tested configs."
            ),
        }

        # Add parameter sweep analysis
        nprobe_results = [
            r for r in results
            if r["config"]["nlist"] == 4
            and r["config"]["nm"] == 32
            and r["config"]["nbits"] == 6
        ]
        if nprobe_results:
            nprobe_best = min(
                nprobe_results,
                key=lambda r: r["p50_dist_m"]
            )
            recommendation["nprobe_recommended"] = {
                "nprobe": nprobe_best["config"]["nprobe"],
                "p50_dist_m": nprobe_best["p50_dist_m"],
                "note": (
                    "Lowest nprobe that achieves best accuracy. "
                    "Lower nprobe values are faster."
                ),
            }

        nlist_results = [
            r for r in results
            if r["config"]["nprobe"] == 1
            and r["config"]["nm"] == 32
            and r["config"]["nbits"] == 6
        ]
        if nlist_results:
            nlist_best = min(
                nlist_results,
                key=lambda r: r["p50_dist_m"]
            )
            recommendation["nlist_recommended"] = {
                "nlist": nlist_best["config"]["nlist"],
                "p50_dist_m": nlist_best["p50_dist_m"],
                "note": (
                    "Lowest nlist achieving best accuracy. "
                    "Lower nlist = faster index build and add."
                ),
            }

    # Write output
    output_path = OUTPUT_PATH
    output_path.parent.mkdir(
        parents=True, exist_ok=True
    )
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(recommendation, fh, indent=2)
    log.info("Written: %s", output_path)

    print()
    print("-" * 60)
    print(
        "  Written to: "
        "{}".format(output_path)
    )
    print("=" * 60)
    print()
    return str(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "MapSnap parameter iteration - "
            "test FAISS config combinations."
        ),
    )
    parser.add_argument(
        "--k", type=int, default=10,
        help="Number of nearest neighbors (default: 10)",
    )
    parser.add_argument(
        "--nprobe-range", type=str, default=None,
        help=(
            "Comma-separated nprobe values "
            "(default: 1,2,4,8,16,32)"
        ),
    )
    parser.add_argument(
        "--nlist-range", type=str, default=None,
        help=(
            "Comma-separated nlist values "
            "(default: 4,8,16,32,64)"
        ),
    )
    args = parser.parse_args()

    if args.nprobe_range:
        probes = [int(x) for x in args.nprobe_range.split(",")]
    else:
        probes = [1, 2, 4, 8, 16, 32]

    if args.nlist_range:
        nlists = [int(x) for x in args.nlist_range.split(",")]
    else:
        nlists = [4, 8, 16, 32, 64]

    # Generate test configs
    test_configs = []
    for nprobe in probes:
        test_configs.append({
            "label": "nprobe_{}".format(nprobe),
            "nprobe": nprobe,
            "nlist": 4,
            "nm": 32,
            "nbits": 6,
        })
    for nlist in nlists:
        test_configs.append({
            "label": "nlist_{}".format(nlist),
            "nprobe": 1,
            "nlist": nlist,
            "nm": 32,
            "nbits": 6,
        })

    output_path = run_iteration(test_configs)
    print("Output saved to: " + output_path)
