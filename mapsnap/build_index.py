#!/usr/bin/env python3
"""
MapSnap FAISS Index Builder

Builds a nearest-neighbor FAISS index from the dummy embeddings produced by
extract_features.py and supports fast location-based search.

Usage:
    python3 build_index.py              # build index + run tests
    python3 build_index.py --build-only # just build the index

Functions exported as module:
    build_index() -> faiss.Index
    search(query_embedding, k=5) -> list of (pano_id, distance, lat, lng)
    generate_query_embedding(lat, lng, seed=42) -> np.ndarray
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
EMBED_DIR = DATA_DIR / "embeddings"
INDEX_FILE = DATA_DIR / "embedding_index.jsonl"
FAISS_INDEX_PATH = DATA_DIR / "faiss_index.faiss"
EMBEDDING_DIM = 768

# PQ parameters
NLIST = 4               # number of Voronoi cells for IVF
M = 32                  # number of subvectors per codeword (768/32=24 dim each)
NBITS_PER_SUBVECTOR = 6 # 6-bit PQ → 2^6 = 64 codeword entries per subvector
N_SUBVECTORS = 64       # (informational) codebook entries per subvector

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
# Helper: generate a dummy query embedding (matches extract_features.py)
# ---------------------------------------------------------------------------

def generate_query_embedding(lat: float, lng: float, seed: int = 42) -> np.ndarray:
    """
    Generate a deterministic pseudo-random embedding from lat/lng.

    This reproduces the same hashing / normalization logic as
    extract_features.generate_dummy_features(), so queries can be
    constructed from raw coordinates without needing the extractor.

    Returns a 1-D numpy array of shape (768,) with dtype float32.
    """
    import hashlib
    import random

    h = hashlib.sha256(f"{lat:.6f},{lng:.6f},{seed}".encode()).digest()
    rng = random.Random(int.from_bytes(h[:4], "big"))

    features = []
    for _ in range(EMBEDDING_DIM):
        if rng.random() < 0.4:
            features.append(0.0)
        else:
            features.append(rng.gauss(0, 0.5))

    norm = sum(f * f for f in features) ** 0.5
    if norm > 0:
        features = [f / norm for f in features]

    return np.array(features, dtype=np.float32)


# ---------------------------------------------------------------------------
# Build index
# ---------------------------------------------------------------------------

def load_embeddings() -> Tuple[np.ndarray, List[dict]]:
    """
    Load all embeddings from .npy files using the embedding_index.jsonl mapping.

    Returns:
        embeddings: 2-D array (n, 768), float32
        records: list of index records from embedding_index.jsonl
    """
    records: List[dict] = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))

    log.info("Loaded %d records from embedding index", len(records))

    # Load each .npy file (paths are relative to BASE_DIR)
    embeddings_list: list[np.ndarray] = []
    for rec in records:
        emb_path = BASE_DIR / rec["embedding_file"]
        if not emb_path.exists():
            log.warning("Missing embedding file: %s", emb_path)
            continue
        emb = np.load(str(emb_path)).astype(np.float32)
        embeddings_list.append(emb)

    if not embeddings_list:
        raise RuntimeError("No embeddings loaded — check data/embeddings/ and embedding_index.jsonl")

    embeddings = np.vstack(embeddings_list)
    log.info("Loaded embeddings array: shape=%s", embeddings.shape)
    return embeddings, records


def build_index() -> faiss.Index:
    """
    Build an IVF-PQ FAISS index from the loaded embeddings and save to disk.

    Returns the trained index object.
    """
    embeddings, _ = load_embeddings()

    # Normalize embeddings for inner-product (cosine similarity)
    faiss.normalize_L2(embeddings)

    # -- Build IVF-PQ index --
    quantizer = faiss.IndexFlatIP(EMBEDDING_DIM)  # inner product on normalized vectors = cosine
    index = faiss.IndexIVFPQ(
        quantizer,
        EMBEDDING_DIM,
        NLIST,
        M,               # number of subvectors (768 / M = 24 dim each)
        NBITS_PER_SUBVECTOR,  # bits per subvector (6-bit PQ -> 64 codebook entries)
    )

    index.verbose = True
    index.train(embeddings)
    index.add(embeddings)

    log.info(
        "Built IVF-PQ index: nlist=%d m=%d nbits=%d | %d vectors of dim %d",
        NLIST, M, NBITS_PER_SUBVECTOR, index.ntotal, EMBEDDING_DIM,
    )

    # Save to disk
    faiss.write_index(index, str(FAISS_INDEX_PATH))
    log.info("Saved FAISS index to %s", FAISS_INDEX_PATH)

    return index


def load_saved_index() -> faiss.Index:
    """Load a previously saved FAISS index from disk."""
    index = faiss.read_index(str(FAISS_INDEX_PATH))
    log.info("Loaded FAISS index from %s (%d vectors)", FAISS_INDEX_PATH, index.ntotal)
    return index


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search(
    query_embedding: np.ndarray,
    index: faiss.Index,
    records: List[dict],
    k: int = 5,
) -> List[Tuple[str, float, float, float]]:
    """
    Find the k nearest neighbors to the query embedding.

    Args:
        query_embedding: 1-D array of shape (768,)
        index: trained FAISS index
        records: list of index records (same order as embeddings)
        k: number of nearest neighbors

    Returns:
        List of (pano_id, distance, lat, lng) tuples sorted by distance descending.
    """
    q = query_embedding.reshape(1, -1).astype(np.float32)
    faiss.normalize_L2(q)

    distances, labels = index.search(q, min(k, index.ntotal))

    results: List[Tuple[str, float, float, float]] = []
    for dist, label in zip(distances[0], labels[0]):
        if label < 0:
            continue  # FAISS returns -1 for padding
        rec = records[label]
        results.append((rec["pano_id"], float(dist), rec["lat"], rec["lng"]))

    return results


# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------

def run_tests() -> None:
    """Build (or load) the index, run a test search, and measure latency."""
    # Build or load index
    if FAISS_INDEX_PATH.exists():
        index = load_saved_index()
    else:
        index = build_index()

    embeddings, records = load_embeddings()

    # --- Test 1: Search with a known pano (first one in index) ---
    print("\n" + "=" * 60)
    print("TEST 1: Nearest-neighbor search (top-5)")
    print("=" * 60)

    query_emb = embeddings[0]  # use first embedding as query
    query_pano = records[0]["pano_id"]
    print(f"\nQuery pano_id: {query_pano} (first entry in index)")

    results = search(query_emb, index, records, k=5)
    print(f"\nTop-5 nearest neighbors to {query_pano}:")
    print(f"{'Rank':<6} {'pano_id':<14} {'distance':>10} {'lat':>10} {'lng':>12}")
    print("-" * 56)
    for i, (pid, dist, lat, lng) in enumerate(results, 1):
        print(f"{i:<6} {pid:<14} {dist:>10.6f} {lat:>10.4f} {lng:>12.4f}")

    # --- Test 2: Query from coordinates (not in index) ---
    print("\n" + "=" * 60)
    print("TEST 2: Coordinate-based query (dummy location)")
    print("=" * 60)

    # Query at a nearby coordinate (slightly offset from first entry)
    query_lat = records[0]["lat"] + 0.01
    query_lng = records[0]["lng"] - 0.01
    print(f"\nQuerying at lat={query_lat:.6f}, lng={query_lng:.6f}")

    query_emb = generate_query_embedding(query_lat, query_lng)
    results = search(query_emb, index, records, k=5)
    print(f"\nTop-5 nearest neighbors:")
    print(f"{'Rank':<6} {'pano_id':<14} {'distance':>10} {'lat':>10} {'lng':>12}")
    print("-" * 56)
    for i, (pid, dist, lat, lng) in enumerate(results, 1):
        print(f"{i:<6} {pid:<14} {dist:>10.6f} {lat:>10.4f} {lng:>12.4f}")

    # --- Test 3: Latency measurement ---
    print("\n" + "=" * 60)
    print("TEST 3: Search latency (100 iterations)")
    print("=" * 60)

    n_iter = 100
    latencies: List[float] = []

    for _ in range(n_iter):
        t0 = time.perf_counter()
        search(query_emb, index, records, k=5)
        latencies.append(time.perf_counter() - t0)

    avg_ms = (sum(latencies) / len(latencies)) * 1000
    p50_ms = sorted(latencies)[len(latencies) // 2] * 1000
    p99_ms = sorted(latencies)[int(len(latencies) * 0.99)] * 1000

    print(f"\n  Iterations:     {n_iter}")
    print(f"  Avg latency:    {avg_ms:.3f} ms")
    print(f"  P50 latency:    {p50_ms:.3f} ms")
    print(f"  P99 latency:    {p99_ms:.3f} ms")
    print(f"  Min latency:    {min(latencies) * 1000:.3f} ms")
    print(f"  Max latency:    {max(latencies) * 1000:.3f} ms")

    ok = "PASS" if avg_ms < 500 else "FAIL"
    print(f"\n  Threshold: <500ms -> {ok}")

    print("\n" + "=" * 60)
    print(f"All tests completed! Index saved to {FAISS_INDEX_PATH}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MapSnap FAISS index builder")
    parser.add_argument(
        "--build-only", action="store_true",
        help="Build the index without running tests",
    )
    parser.add_argument(
        "--load", action="store_true",
        help="Load an existing index instead of rebuilding",
    )
    args = parser.parse_args()

    if args.load and FAISS_INDEX_PATH.exists():
        index = load_saved_index()
        embeddings, records = load_embeddings()
        # Quick search to verify
        q = generate_query_embedding(33.65, -83.97)
        results = search(q, index, records, k=5)
        print(f"Loaded index OK. Top-5 for (33.65, -83.97): {results[:3]}")
    elif args.build_only:
        build_index()
        print("Index built successfully.")
    else:
        build_index()
        run_tests()
