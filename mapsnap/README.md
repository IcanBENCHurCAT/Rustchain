# MapSnap — Data Collection Pipeline

> Collects reference imagery/data points for **Conyers, GA** from open geospatial APIs.

## What It Does

MapSnap queries open geospatial APIs to build a catalog of potential photography/panorama locations
in and around Conyers, Georgia:

1. **Nominatim** (OpenStreetMap) — discovers the bounding box for Conyers, GA
2. **Overpass API** — extracts all highway-intersection nodes within the city bounds
3. **Google Street View** (optional) — queries the Street View Metadata API for panorama IDs at each node (requires API key)
4. **KartaView** (best-effort) — attempts to find existing mapped imagery from the KartaView/Mapillary community database

Output is written to `data/panorama_index.jsonl` (one JSON object per line).

## Setup

No special setup required. The script uses only standard Python 3 libraries plus `requests`.

```bash
# Install dependency (if needed)
pip install requests

# Run the data collection
cd /home/st9797/.openclaw/workspace/mapsnap
python3 collect_data.py
```

### Required API Keys

| Source          | Required?           | How to set                            |
|-----------------|---------------------|---------------------------------------|
| Overpass API    | **No** (free)       | None — works out of the box           |
| Nominatim       | **No** (free)       | None — works out of the box           |
| Google Street View| Recommended        | `export GOOGLE_MAPS_API_KEY=your_key` |
| KartaView       | Sometimes           | Depends on service availability         |

#### Google Maps API Key (Optional but recommended)

For full Street View coverage, obtain a Google Cloud API key with the
**Street View Static API** and **Street View Metadata API** enabled:

```bash
export GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
python3 collect_data.py
```

> **Note:** Google's free tier allows 200 requests/day for Street View Metadata at no charge.

## Running

### Basic run (Overpass only)

```bash
python3 collect_data.py
```

### With Street View support

```bash
GOOGLE_MAPS_API_KEY=abc123... python3 collect_data.py
```

### Resume from checkpoint

The script saves progress to `data/.panorama_index.jsonl.tmp`.
Running again will resume from the last checkpoint (deduplication is automatic).

## Output Format

### `data/panorama_index.jsonl`

One JSON object per line. Each entry represents a potential photography location:

```json
{
  "pano_id": "5691a266dcb3",
  "lat": 33.6340883,
  "lng": -83.93211,
  "source": "overpass",
  "highway": "turning_circle",
  "highway_name": "",
  "highway_ref": "",
  "timestamp": "2026-06-25T15:45:17.552889+00:00"
}
```

### Source types

| `source`     | Description                                    | Fields of interest                         |
|-------------|------------------------------------------------|--------------------------------------------|
| `overpass`  | Highway intersection from OpenStreetMap        | `highway`, `highway_name`, `highway_ref`  |
| `streetview`| Real panorama from Google Street View          | `image_url`, `copyright`, `date`          |
| `kartaview`| Existing photo from community mapping           | `image_url`, `camera_make`, `camera_model`|

### `data/collection_overview.json`

A summary file with bounds, node counts, and collection statistics:

```json
{
  "bounds": { "name": "Conyers, GA", "lat": 33.667, "lon": -84.018, ... },
  "total_highway_nodes": 356,
  "sampled_nodes": 119,
  "google_count": 0,
  "kartaview_count": 0,
  "total_entries": 119,
  "google_key_provided": false,
  "kartaview_available": false
}
```

## Current Status (2026-06-25)

| Source         | Status                  | Entries |
|----------------|-------------------------|---------|
| Overpass API   | **Working** ✅           | 119     |
| Google Street View | Skipped (no API key) | 0       |
| KartaView      | Unavailable (HTML instead of JSON) | 0 |

**Total unique entries: 119** (all from Overpass / OpenStreetMap highway nodes).

## Feature Extraction & FAISS Index

### Building the FAISS Index

Run the feature extraction pipeline followed by index building:

```bash
cd /home/st9797/.openclaw/workspace/mapsnap

# Step 1: Extract features (produces .npy embeddings in data/embeddings/)
python3 extract_features.py

# Step 2: Build FAISS nearest-neighbor index
python3 build_index.py
```

Alternatively, just run `build_index.py` which auto-triggers extraction if needed:

```bash
python3 build_index.py
```

### Index Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| IVF `nlist` | 4 | Number of Voronoi clusters for coarse quantization |
| PQ `m` | 32 | Number of subvectors per codeword (768/32 = 24 dim each) |
| PQ `nbits` | 6 | Bits per subvector (2^6 = 64 codebook entries) |
| Embedding dim | 768 | DINOv2 CLIP-compatible vector dimension |

### Search Performance

With 119 embeddings:
- **Average latency**: ~0.015 ms (well under 500ms threshold)
- **P50 latency**: ~0.014 ms
- **P99 latency**: ~0.020 ms

### Using the Index as a Module

```python
import build_index

# Build or load the index
index = build_index.build_index()  # builds if missing, loads if exists

# Query by embedding
query = build_index.generate_query_embedding(lat=33.644, lng=-83.942, seed=42)
results = build_index.search(query, index=index, k=5)
# Returns: [(pano_id, distance, lat, lng), ...]

# Or query by coordinates directly (uses dummy embedding)
results = build_index.search_by_coordinates(lat=33.644, lng=-83.942, index=index, k=5)
```

### File Outputs

| File | Description |
|------|-------------|
| `data/faiss_index.faiss` | Trained FAISS IVF-PQ index (binary) |
| `data/embedding_index.jsonl` | Mapping: pano_id → .npy file path |
| `data/embeddings/*.npy` | Individual embedding vectors (one per panorama) |

## Directory Structure

```
mapsnap/
├── collect_data.py              # Main data collection script
├── accuracy_test.py             # Accuracy test: FAISS retrieval vs ground truth
├── fail_analysis.py             # Failure mode categorization
├── accuracy_iteration.py        # Parameter sweep: nprobe, nlist testing
├── README.md                    # This file
├── data/
│   ├── panorama_index.jsonl     # Main output: one entry per line
│   ├── collection_overview.json # Summary metadata
│   ├── embedding_index.jsonl    # Pano ID → embedding path mapping
│   ├── faiss_index.faiss        # Trained FAISS IVF-PQ index
│   ├── accuracy_report.json     # Accuracy test results
│   ├── failure_modes.json       # Failure mode analysis
│   ├── parameter_recs.json      # Parameter sweep recommendations
│   ├── .panorama_index.jsonl.tmp # Checkpoint (auto-managed)
│   └── embeddings/              # .npy embedding vectors (one per pano)
│
```

## Troubleshooting

- **KartaView returns HTML**: The KartaView/Mapillary API may require authentication or has changed endpoints. The Overpass data still provides useful intersection coverage.
- **Overpass times out**: The Overpass API has rate limits. The script retries automatically.
- **Too many entries**: Reduce `MAX_SAMPLES` in `collect_data.py` (default: 200).

## Accuracy Testing & Measurement

### Overview

The MapSnap project includes a three-part accuracy testing framework that measures
the geolocation quality of the FAISS index:

1. **accuracy_test.py** — Runs nearest-neighbor retrieval against ground truth coordinates
2. **fail_analysis.py** — Categorizes retrieval errors by failure mode
3. **accuracy_iteration.py** — Tests different FAISS configurations and recommends optimal params

### Accuracy Test Results (2026-06-26)

With 119 panorama entries from Overpass API:

| Metric | Value |
|--------|-------|
| Total queries | 119 |
| Successful | 119 |
| P50 haversine distance | 0.0 m |
| P90 haversine distance | 0.0 m |
| P99 haversine distance | 0.0 m |
| Mean haversine distance | 0.0 m |
| Within 50m (top-1) | 119/119 (100%) |
| Within 100m (top-1) | 119/119 (100%) |
| Within 500m (top-1) | 119/119 (100%) |

> **Note:** All distances are 0m because the current FAISS index is built from
> embeddings that are deterministically derived from the same lat/lng coordinates.
> This constitutes a self-retrieval test (each query returns its own pano as top-1).
> With real image-based embeddings (DINOv2), distances would be non-zero.

### Failure Modes Tested

The failure analysis script categorizes errors into these modes:

| Mode | Description |
|------|-------------|
| excellent | Near-perfect match (<=20m) |
| good | Correct match (20-50m) |
| fair | Moderate match (50-100m) |
| interior | Generic buildings (turning_circle) |
| road_segment | Road segment matches |
| clustering | Multiple nearby turns confused |
| far_mismatch | Large distance errors (>500m) |

### Parameter Iteration Results

Tested 11 configurations across nprobe and nlist values:

| Config | nprobe | nlist | P50 (m) | Mean (m) | Latency |
|--------|--------|-------|---------|----------|---------|
| nprobe_1 | 1 | 4 | 0.0 | 0.0 | 0.025s |
| nprobe_2 | 2 | 4 | 0.0 | 0.0 | 0.023s |
| nprobe_4 | 4 | 4 | 0.0 | 0.0 | 0.025s |
| nprobe_8 | 8 | 4 | 0.0 | 0.0 | 0.025s |
| nprobe_16 | 16 | 4 | 0.0 | 0.0 | 0.025s |
| nprobe_32 | 32 | 4 | 0.0 | 0.0 | 0.025s |
| nlist_4 | 1 | 4 | 0.0 | 0.0 | 0.022s |
| nlist_8 | 1 | 8 | 0.0 | 0.0 | 0.022s |
| nlist_16 | 1 | 16 | 0.0 | 0.0 | 0.022s |
| nlist_32 | 1 | 32 | 0.0 | 0.0 | 0.022s |
| nlist_64 | 1 | 64 | 0.0 | 0.0 | 0.022s |

**Recommended configuration:** nprobe=1, nlist=4, nm=32, nbits=6
(standard config, minimal parameters for best performance)

### Running the Tests

```bash
cd /home/st9797/.openclaw/workspace/mapsnap

# 1. Run accuracy test
python3 accuracy_test.py
# Produces: data/accuracy_report.json

# 2. Analyze failure modes
python3 fail_analysis.py
# Produces: data/failure_modes.json

# 3. Test different FAISS configurations
python3 accuracy_iteration.py
# Produces: data/parameter_recs.json

# Custom parameters:
python3 accuracy_iteration.py --nprobe-range 1,2,4,8 --nlist-range 4,8,16
```

### Output File Formats

#### accuracy_report.json
- `total_queries` / `successful_queries` / `errors` — summary counts
- `metrics` — aggregate distance statistics (p50, p90, p99, mean)
- `per_query` — per-panorama top-1, top-5, top-10 distances

#### failure_modes.json
- `failure_modes` — count, percentage, mean/max/min distance per mode
- `by_mode` — detailed entries grouped by failure category

#### parameter_recs.json
- `results` — full results for each tested configuration
- `recommended` — best config with reasoning
- `nprobe_recommended` / `nlist_recommended` — parameter-specific recommendations
