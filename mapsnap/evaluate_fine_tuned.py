#!/usr/bin/env python3
"""MapSnap Fine-Tuning Evaluation

Compares geolocation accuracy before and after fine-tuning
the DINOv2 embedding space using contrastive learning.

Usage:
    python3 evaluate_fine_tuned.py --samples 50
    python3 evaluate_fine_tuned.py --model-path path/to/checkpoint.pt
"""

import argparse
import json
import logging
import numpy as np
import torch
import faiss
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
EVAL_RESULTS = DATA_DIR / "finetune_results.json"
EMBEDDED_IDX = DATA_DIR / "embedding_index.jsonl"


def load_embeddings(path):
    """Load embeddings from jsonl index."""
    records = []
    with open(path) as f:
        for line in f:
            rec = json.loads(line)
            if rec.get("status") == "embedded":
                records.append(rec)
    log.info("Loaded %d embedded entries", len(records))
    return records


def haversine(lat1, lon1, lat2, lon2):
    """Return distance in meters between two lat/lon points."""
    R = 6371000
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2) ** 2
    )
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c


def build_faiss_index(embeddings):
    """Build FAISS index for nearest-neighbor search."""
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

def evaluate_baseline(records, embeddings, lats, lngs, top_k=1):
    """Evaluate geolocation accuracy with original (pre-finetune) embeddings."""
    index = build_faiss_index(embeddings)
    distances_m = []
    for i in range(len(records)):
        q = embeddings[i : i + 1]
        D, I = index.search(q, top_k)
        best_j = I[0][0]
        dist = haversine(lats[i], lngs[i], lats[best_j], lngs[best_j])
        distances_m.append(dist)
    distances_m = np.array(distances_m)

    metrics = {
        "p50_distance_m": float(np.percentile(distances_m, 50)),
        "p90_distance_m": float(np.percentile(distances_m, 90)),
        "p99_distance_m": float(np.percentile(distances_m, 99)),
        "mean_distance_m": float(np.mean(distances_m)),
        "top1_within_50m": float(np.sum(distances_m < 50) / len(distances_m)),
        "top1_within_100m": float(np.sum(distances_m < 100) / len(distances_m)),
        "top1_within_500m": float(np.sum(distances_m < 500) / len(distances_m)),
    }
    log.info("Baseline evaluation complete:")
    log.info("  P50:   %.0f m", metrics["p50_distance_m"])
    log.info("  P90:   %.0f m", metrics["p90_distance_m"])
    log.info("  P99:   %.0f m", metrics["p99_distance_m"])
    log.info("  Mean:  %.0f m", metrics["mean_distance_m"])
    log.info("  Top1<50m: %.1f%%", 100 * metrics["top1_within_50m"])
    return metrics


def load_finetune_model(path):
    """Load fine-tuned projection model from checkpoint."""
    from torch import nn

    class ProjectionHead(nn.Module):
        def __init__(self, in_dim, hidden=256, out_dim=128):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(in_dim, hidden),
                nn.BatchNorm1d(hidden),
                nn.ReLU(),
                nn.Linear(hidden, out_dim),
            )
        def forward(self, x):
            return self.net(x)

    ckpt = torch.load(path, map_location="cpu", weights_only=True)
    state = ckpt["model_state_dict"]
    # Map proj.net.* -> net.* keys
    mapped = {}
    for k, v in state.items():
        if k.startswith("proj.net."):
            mapped[k[len("proj."):]] = v
    model = ProjectionHead(in_dim=768)
    model.load_state_dict(mapped)
    model.eval()
    log.info("Fine-tuned model loaded (projection head)")
    return model
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    log.info("Fine-tuned model loaded (projection head)")
    return model

def transform_embeddings(embeddings, model, batch_size=64):
    """Apply fine-tuning projection head to embeddings."""
    model.eval()
    results = []
    with torch.no_grad():
        for i in range(0, len(embeddings), batch_size):
            batch = embeddings[i : i + batch_size]
            if isinstance(batch, np.ndarray):
                batch = torch.from_numpy(batch).float()
            projected = model(batch)
            results.append(projected)
    transformed = torch.cat(results, dim=0)
    return transformed.cpu().numpy()


def evaluate_fine_tuned(records, embeddings, lats, lngs, model_path):
    """Evaluate geolocation accuracy with fine-tuned (transformed) embeddings."""
    log.info("Loading fine-tuned model...")
    model = load_finetune_model(model_path)
    log.info("Transforming embeddings...")
    ft_embeddings = transform_embeddings(embeddings, model)
    log.info(
        "Transformed %d embeddings -> %d-dim",
        len(embeddings),
        ft_embeddings.shape[1],
    )
    return evaluate_baseline(records, ft_embeddings, lats, lngs)


def save_results(before, after):
    """Save before/after evaluation results to JSON."""
    improvement = {}
    for key in ["p50_distance_m", "p90_distance_m", "p99_distance_m", "mean_distance_m"]:
        b_val = before[key]
        a_val = after[key]
        improvement[f"{key}_improvement_pct"] = (
            round((b_val - a_val) / b_val * 100, 2) if b_val > 0 else 0
        )
    for key in ["top1_within_50m", "top1_within_100m", "top1_within_500m"]:
        b_val = before[key]
        a_val = after[key]
        improvement[f"{key}_improvement_pct"] = round((a_val - b_val) * 100, 2)

    results = {
        "before_finetune": before,
        "after_finetune": after,
        "improvement": improvement,
    }
    with open(EVAL_RESULTS, "w") as f:
        json.dump(results, f, indent=2)
    log.info("Results saved to %s", EVAL_RESULTS)
    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned DINOv2 embeddings")
    parser.add_argument(
        "--samples", type=int, default=50, help="Use first N samples (default: 50)"
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=None,
        help="Path to fine-tuned model checkpoint (default: data/finetuned_model.pt)",
    )
    args = parser.parse_args()

    log.info("=== MapSnap Fine-Tuning Evaluation ===")
    log.info("Data directory: %s", DATA_DIR)

    # Load data
    records = load_embeddings(EMBEDDED_IDX)
    if not records:
        log.error("No embedded records found. Run extract_embeddings.py first.")
        return

    n = min(args.samples, len(records))
    records = records[:n]
    log.info("Using %d samples", n)

    # Load embeddings
    emb_paths = [r["embedding_file"] for r in records]
    embeddings = np.stack([np.load(p) for p in emb_paths])
    lats = np.array([r["lat"] for r in records])
    lngs = np.array([r["lng"] for r in records])
    log.info("Embedding shape: %s", embeddings.shape)

    # Before: baseline with original embeddings
    NL = chr(10)
    sep = NL + "=" * 60
    log.info("")
    log.info("Evaluating BASELINE (original embeddings)...")
    before = evaluate_baseline(records, embeddings, lats, lngs)

    # After: fine-tuned
    model_path = args.model_path
    if model_path is None:
        model_path = str(BASE_DIR / "data" / "finetuned_model.pt")

    if not Path(model_path).exists():
        log.warning("Fine-tuned model not found: %s", model_path)
        log.warning("Skipping after-finetune evaluation.")
        save_results(before, before)
        print("")
        print(sep)
        print("EVALUATION COMPLETE (no fine-tuned model found)")
        print(sep)
        return

    log.info("")
    log.info("Evaluating FINE-TUNED (transformed embeddings)...")
    after = evaluate_fine_tuned(records, embeddings, lats, lngs, model_path)

    # Save and display results
    log.info("")
    log.info("Improvement summary:")
    results = save_results(before, after)
    imp = results["improvement"]
    for key, val in imp.items():
        log.info("  %s: %.2f%%", key, val)

    print("")
    print(sep)
    print("EVALUATION COMPLETE")
    print(sep)
    print(f"  Results: {EVAL_RESULTS}")
    print(f"  Before P50: {before['p50_distance_m']:.0f} m")
    print(f"  After P50:  {after['p50_distance_m']:.0f} m")
    print("")


if __name__ == "__main__":
    main()
