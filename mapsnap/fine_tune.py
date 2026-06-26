#!/usr/bin/env python3
"""MapSnap Fine-Tuning Pipeline

Fine-tunes the DINOv2 embedding space using contrastive (InfoNCE) learning.
Uses pre-extracted DINOv2 embeddings as features (not raw images).
Implements Siamese-style training with proximity-based positive pairs.
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent / "data"
PANORAMA_IDX = DATA_DIR / "panorama_index.jsonl"
EMBEDDING_IDX = DATA_DIR / "embedding_index.jsonl"
EMBEDDED_IDX = DATA_DIR / "embedding_index.jsonl"
MODEL_SAVE_PATH = DATA_DIR / "finetuned_model.pt"
EMBEDDING_DIM = 768
PROJ_OUT = 128
TEMPERATURE = 0.1


def load_panorama_index(path):
    """Load panorama index from JSONL."""
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    log.info("Loaded %d panorama entries", len(records))
    return records


def load_embeddings(path):
    """Load embedding index."""
    records, emb_paths = [], []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rec = json.loads(line)
                if rec.get("status") == "embedded":
                    records.append(rec)
                    emb_paths.append(rec.get("embedding_file", ""))
    log.info("Loaded %d embedded entries", len(records))
    return records, emb_paths


def load_embedding_vector(ep):
    """Load a single .npy embedding."""
    return np.load(ep)


def build_dataset(records, emb_paths, samples=None):
    """Build dataset from embeddings."""
    if samples is not None:
        idxs = np.random.RandomState(42).choice(len(records), samples, replace=False)
        records = [records[i] for i in idxs]
        emb_paths = [emb_paths[i] for i in idxs]
    vectors, lats, lngs = [], [], []
    for rec, ep in zip(records, emb_paths):
        try:
            vectors.append(load_embedding_vector(ep))
            lats.append(rec["lat"])
            lngs.append(rec["lng"])
        except Exception as e:
            log.warning("Skipping %s: %s", ep, e)
    vectors = np.stack(vectors)
    log.info("Dataset shape: %s (dim=%d)", vectors.shape, vectors.shape[-1])
    return vectors, lats, lngs, records


def haversine(lat1, lng1, lat2, lng2):
    """Distance in km."""
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlng = np.radians(lng2 - lng1)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlng/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c
def build_proximity_graph(lats, lngs, radius_km=0.25):
    """Build adjacency from geographic proximity."""
    n = len(lats)
    adj = np.zeros((n, n), dtype=bool)
    for i in range(n):
        for j in range(i+1, n):
            d = haversine(lats[i], lngs[i], lats[j], lngs[j])
            if d < radius_km:
                adj[i][j] = adj[j][i] = True
    total = n * (n - 1) // 2
    log.info("Proximity graph: %d edges from %d possible", adj.sum()//2, total)
    return adj


class ProjectionHead(nn.Module):
    """Lightweight MLP projection on top of DINOv2 features."""
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


class ContrastiveModel(nn.Module):
    """Siamese projection with InfoNCE training."""
    def __init__(self, in_dim=768):
        super().__init__()
        self.proj = ProjectionHead(in_dim)
        self.register_buffer('embeddings', None)

    def forward(self, x):
        return self.proj(x)



    def compute_contrastive_loss(self, anchor_idx, pos_idx, device):
        """InfoNCE contrastive loss."""
        ba, bp = anchor_idx.to(device), pos_idx.to(device)
        z_a, z_p = self.embeddings[ba], self.embeddings[bp]
        p_a = F.normalize(self.proj(z_a), dim=1)
        p_p = F.normalize(self.proj(z_p), dim=1)
        bs = len(p_a)
        sim = torch.mm(p_a, p_p.T) / TEMPERATURE
        labels = torch.arange(bs, device=device)
        return (F.cross_entropy(sim, labels) + F.cross_entropy(sim.T, labels)) / 2.0


class ProximityDataset(Dataset):
    """Dataset yielding anchor/positive pairs from proximity graph."""
    def __init__(self, adj_matrix):
        self.adj = adj_matrix
        self.pos_pairs = list(zip(*np.where(adj_matrix)))

    def __len__(self):
        return len(self.pos_pairs)

    def __getitem__(self, idx):
        i, j = self.pos_pairs[idx]
        return int(i), int(j)


def train_epoch(model, dataloader, optimizer, device):
    model.train()
    total, n = 0.0, 0
    for ai, pi in dataloader:
        optimizer.zero_grad()
        loss = model.compute_contrastive_loss(ai, pi, device)
        loss.backward()
        optimizer.step()
        total += loss.item()
        n += 1
    return total / max(n, 1)




def train(model, dataloader, epochs=5, lr=1e-3, device=None):
    """Main training loop."""
    if device is None: device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    optimizer = torch.optim.Adam(model.proj.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    log.info("Training on %s, epochs=%d, lr=%.4f", device, epochs, lr)
    history = {"train_loss": []}
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        avg_loss = train_epoch(model, dataloader, optimizer, device)
        history["train_loss"].append(avg_loss)
        log.info("Epoch %3d | loss=%.4f | %.1fs", epoch, avg_loss, time.time() - t0)
        scheduler.step()
    return history


def save_model(model, history):
    """Save model weights."""
    checkpoint = {"model_state_dict": model.state_dict(), "history": history, "temperature": TEMPERATURE}
    MODEL_SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, str(MODEL_SAVE_PATH))
    log.info("Model saved to %s", MODEL_SAVE_PATH)


def load_model(path=MODEL_SAVE_PATH):
    """Load fine-tuned model."""
    ckpt = torch.load(path, map_location="cpu", weights_only=True)
    model = ContrastiveModel(in_dim=768)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    return model, ckpt["history"]


def main():
    parser = argparse.ArgumentParser(description="Fine-tune DINOv2 on Conyers data")
    parser.add_argument("--samples", type=int, default=50)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()
    log.info("=== MapSnap Fine-Tuning ===")
    log.info("Samples=%d, Epochs=%d", args.samples, args.epochs)

    # Load data
    records, emb_paths = load_embeddings(EMBEDDING_IDX)
    embeddings, lats, lngs, meta = build_dataset(records, emb_paths, samples=args.samples)

    # Build proximity graph
    adj = build_proximity_graph(lats, lngs, radius_km=0.25)

    # Dataset and loader
    ds = ProximityDataset(adj)
    loader = DataLoader(ds, batch_size=args.batch_size, shuffle=True, pin_memory=True)

    # Init model
    model = ContrastiveModel(in_dim=embeddings.shape[-1])
    model.embeddings = torch.from_numpy(embeddings).float()

    # Train
    history = train(model, loader, epochs=args.epochs, lr=args.lr)

    # Save
    save_model(model, history)

    sep = chr(10) + "=" * 60
    print("")
    print(sep)
    print("FINE-TUNING COMPLETE")
    print(sep)
    print(f"  Model:       {MODEL_SAVE_PATH}")
    print(f"  Samples:     {args.samples}")
    print(f"  Epochs:      {args.epochs}")
    tloss = history["train_loss"][-1]
    print(f"  Final Loss:  {tloss:.4f}")
if __name__ == "__main__":
    main()
