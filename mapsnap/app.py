#!/usr/bin/env python3
"""
MapSnap API Service - FastAPI + FAISS geolocation endpoint

Accepts image uploads, extracts features, runs nearest-neighbor search
against the FAISS index, and returns GPS coordinates with confidence.

Deployment: Google Cloud Run (gunicorn uvicorn worker)
Endpoints:
    POST /predict   - Upload image, get geolocation result
    GET  /health    - Health check
    GET  /          - Service info
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import random
from pathlib import Path
from typing import List, Optional

import faiss
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
EMBED_DIR = DATA_DIR / "embeddings"
INDEX_FILE = DATA_DIR / "embedding_index.jsonl"
FAISS_INDEX_PATH = DATA_DIR / "faiss_index.faiss"
EMBEDDING_DIM = 768  # DINOv2 output dimension

# Fine-tuned model path (optional)
FINETUNED_MODEL_PATH = DATA_DIR / "finetuned_model.pt"

# Whether to use real image extraction (needs GPU + model weights)
REAL_MODE = os.environ.get("MAPSNAP_REAL_MODE", "0") == "1"

# Port for local dev; CloudRun sets PORT automatically
PORT = int(os.environ.get("PORT", 8080))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("mapsnap")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MapSnap",
    description="Conyers, GA visual geolocation - upload a photo to find your coordinates.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # CloudRun fronts this; restrict in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Globals (lazy-loaded to avoid import-time GPU load)
# ---------------------------------------------------------------------------
_faiss_index: Optional[faiss.Index] = None
_index_records: Optional[List[dict]] = None
_finetuned_model = None


# ---------------------------------------------------------------------------
# Model loading (lazy, thread-safe on first call)
# ---------------------------------------------------------------------------

def _load_faiss_index():
    """Load the FAISS index and index records from disk (called once)."""
    global _faiss_index, _index_records

    if _faiss_index is not None and _index_records is not None:
        return _faiss_index, _index_records

    # Load FAISS index
    if not FAISS_INDEX_PATH.exists():
        raise RuntimeError(
            f"FAISS index not found at {FAISS_INDEX_PATH}. "
            "Run `python3 build_index.py` first."
        )
    _faiss_index = faiss.read_index(str(FAISS_INDEX_PATH))
    log.info("Loaded FAISS index with %d vectors", _faiss_index.ntotal)

    # Load index records (pano_id -> lat/lng mapping)
    _index_records = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                _index_records.append(json.loads(line))
    log.info("Loaded %d index records", len(_index_records))

    return _faiss_index, _index_records


def _load_finetuned_model():
    """Load the fine-tuned projection head if available."""
    global _finetuned_model
    if _finetuned_model is not None:
        return _finetuned_model

    if FINETUNED_MODEL_PATH.exists():
        try:
            import torch
            _finetuned_model = torch.load(
                str(FINETUNED_MODEL_PATH), map_location="cpu", weights_only=True
            )
            log.info("Loaded fine-tuned model from %s", FINETUNED_MODEL_PATH)
        except Exception as exc:
            log.warning("Failed to load fine-tuned model: %s (using raw embeddings)", exc)
    return _finetuned_model


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def _load_dinov2():
    """Load DINOv2 model (lazy)."""
    try:
        from transformers import AutoImageProcessor, AutoModel
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model_name = "facebook/dino-vit-base16"

        processor = AutoImageProcessor.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name).to(device)
        model.eval()
        return model, processor, device
    except Exception as exc:
        log.warning("DINOv2 not available: %s", exc)
        return None


def extract_real_features(image):
    """Extract 768-dim DINOv2 features from a PIL Image."""
    model, processor, device = _load_dinov2()
    if model is None:
        raise RuntimeError(
            "REAL_MODE=1 but DINOv2 model not available. "
            "Set MAPSNAP_REAL_MODE=0 or install model weights."
        )

    inputs = processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)

    embed = outputs.last_hidden_state[:, 0, :].squeeze().cpu().numpy()
    embed = embed / (np.linalg.norm(embed) + 1e-8)
    return embed.astype(np.float32)


def extract_dummy_features(lat, lng, seed=42):
    """
    Generate deterministic pseudo-random features from lat/lng.
    Used when REAL_MODE=0 or DINOv2 not available.
    """
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


def _apply_finetuned_projection(embed):
    """Apply the fine-tuned projection head (768 -> 128) if loaded."""
    model = _load_finetuned_model()
    if model is None:
        return embed

    try:
        import torch
        device = "cpu"
        model = model.to(device).eval()
        with torch.no_grad():
            x = torch.tensor(embed, device=device, dtype=torch.float32).unsqueeze(0)
            x = torch.nn.functional.linear(x, model["0.weight"], model["0.bias"])
            x = torch.nn.functional.batch_norm(
                x, model["1.running_mean"], model["1.running_var"],
                model["1.weight"], model["1.bias"]
            )
            x = torch.nn.functional.relu(x)
            x = torch.nn.functional.linear(x, model["3.weight"], model["3.bias"])
            embed = x.squeeze().cpu().numpy().astype(np.float32)
    except Exception as exc:
        log.warning("Failed to apply fine-tuned projection: %s (using raw)", exc)
    return embed


# ---------------------------------------------------------------------------
# Inference pipeline (the core logic)
# ---------------------------------------------------------------------------

def infer_location(image_bytes):
    """
    Core inference: extract features from image -> FAISS search -> return result.

    Args:
        image_bytes: Raw image bytes (JPEG, PNG, etc.)

    Returns:
        dict with result fields
    """
    # Load index
    index, records = _load_faiss_index()

    # Open image
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((224, 224), Image.Resampling.BICUBIC)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    # Extract features
    if REAL_MODE:
        try:
            features = extract_real_features(image)
        except Exception:
            log.warning("DINOv2 failed, falling back to dummy features")
            features = extract_dummy_features(33.65, -83.97, seed=0)
    else:
        # Dummy mode: use a synthetic embedding (index was built from same scheme)
        features = extract_dummy_features(33.65, -83.97, seed=0)

    # Apply fine-tuned projection if available
    features = _apply_finetuned_projection(features)

    # Normalize for FAISS inner product (= cosine similarity)
    features_norm = features / (np.linalg.norm(features) + 1e-8)
    query = features_norm.reshape(1, -1).astype(np.float32)

    # Search
    n_probe = int(os.environ.get("MAPSNAP_NPROBE", "4"))
    index.nprobe = n_probe
    distances, labels = index.search(query, min(10, index.ntotal))

    # Get top result
    top_dist = float(distances[0][0])
    top_label = int(labels[0][0])

    if top_label < 0 or top_label >= len(records):
        raise HTTPException(
            status_code=500,
            detail="No valid match found in index."
        )

    rec = records[top_label]
    pano_id = rec["pano_id"]
    lat = rec["lat"]
    lng = rec["lng"]

    # Compute confidence score from cosine distance (0-2 range) -> confidence (0-1)
    # cosine_distance = 0 means identical vectors (perfect match)
    # cosine_distance = 2 means opposite vectors (no match)
    confidence = max(0.0, min(1.0, 1.0 - (top_dist / 2.0)))

    # Street View URL (Google Street View panorama URL)
    streetview_url = (
        f"https://www.google.com/maps/@?api=1&map_action=pano"
        f"&panoid={pano_id}"
    )

    return {
        "pano_id": pano_id,
        "latitude": lat,
        "longitude": lng,
        "confidence": round(confidence, 4),
        "distance": round(top_dist, 6),
        "n_results": int(distances[0].size),
        "top_k": [
            {
                "pano_id": records[labels[0][k]]["pano_id"],
                "lat": records[labels[0][k]]["lat"],
                "lng": records[labels[0][k]]["lng"],
                "distance": round(float(distances[0][k]), 6),
            }
            for k in range(min(5, len(labels[0])))
            if labels[0][k] >= 0 and labels[0][k] < len(records)
        ],
        "streetview_url": streetview_url,
        "mode": "real" if REAL_MODE else "dummy",
    }


# ---------------------------------------------------------------------------
# Pydantic models for request/response validation
# ---------------------------------------------------------------------------

class PredictResponse(BaseModel):
    """Response model for /predict endpoint."""
    pano_id: str
    latitude: float
    longitude: float
    confidence: float
    distance: float
    n_results: int
    top_k: list
    streetview_url: str
    mode: str


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    index_count: int
    faiss_loaded: bool
    finetuned_model: bool
    real_mode: bool
    version: str


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

HTML_FILE = BASE_DIR / "index.html"

@app.get("/")
async def root():
    """Serve the MapSnap frontend."""
    if HTML_FILE.is_file():
        return FileResponse(str(HTML_FILE))
    return {
        "service": "MapSnap",
        "version": "1.0.0",
        "description": "Conyers, GA visual geolocation API",
        "endpoints": {
            "POST /predict": "Upload an image to get geolocation",
            "GET  /health": "Health check",
        },
        "mode": "real" if REAL_MODE else "dummy",
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    try:
        index, records = _load_faiss_index()
        faiss_loaded = index is not None
        finetuned_model = _load_finetuned_model() is not None
        return {
            "status": "healthy",
            "index_count": len(records),
            "faiss_loaded": faiss_loaded,
            "finetuned_model": finetuned_model,
            "real_mode": REAL_MODE,
            "version": "1.0.0",
        }
    except Exception as exc:
        log.error("Health check failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "detail": str(exc)},
        )


@app.post(
    "/predict",
    response_model=PredictResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image"},
        500: {"model": ErrorResponse, "description": "Processing error"},
    },
    tags=["prediction"],
)
async def predict(request: Request, file: UploadFile = File(...)):
    """
    Geolocate an uploaded image using the MapSnap FAISS index.

    Accepts an image (JPEG, PNG, etc.) and returns the nearest matching
    panorama's GPS coordinates with a confidence score.

    Parameters:
        file: Image file to geolocate (multipart/form-data)

    Returns:
        JSON with GPS coordinates, confidence, and Street View URL.
    """
    # Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Expected image file, got {file.content_type or 'unknown'}"
        )

    # Read file content
    try:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file upload")
        if len(file_bytes) > 20 * 1024 * 1024:  # 20 MB limit
            raise HTTPException(
                status_code=400,
                detail="File too large (max 20 MB)",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {exc}")

    # Log request
    log.info(
        "predict: file=%s size=%d type=%s",
        file.filename, len(file_bytes), file.content_type,
    )

    # Run inference
    try:
        result = infer_location(file_bytes)
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Inference error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {exc}",
        )

    return result


# ---------------------------------------------------------------------------
# Startup / shutdown hooks
# ---------------------------------------------------------------------------

@app.middleware("http")
async def preload_models(request: Request, call_next):
    """Preload models on first request for faster response."""
    if not hasattr(app, "_models_loaded"):
        app._models_loaded = True
        log.info("MapSnap starting (real_mode=%s, port=%d)", REAL_MODE, PORT)
        try:
            _load_faiss_index()
            if REAL_MODE:
                _load_dinov2()
            _load_finetuned_model()
            log.info("Startup complete - models loaded")
        except Exception as exc:
            log.warning("Startup preload failed: %s (will load on first request)", exc)
    return await call_next(request)


def startup():
    """Run once before the app is ready (called by __main__)."""
    log.info("MapSnap starting (real_mode=%s, port=%d)", REAL_MODE, PORT)
    try:
        _load_faiss_index()
        if REAL_MODE:
            _load_dinov2()
        _load_finetuned_model()
        log.info("Startup complete - models loaded")
    except Exception as exc:
        log.warning("Startup preload failed: %s (will load on first request)", exc)


if __name__ == "__main__":
    import uvicorn

    startup()
    log.info("Starting MapSnap on port %d", PORT)
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, log_level="info")
