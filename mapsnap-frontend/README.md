# MapSnap Frontend

Mobile-first web app for [MapSnap](../mapsnap/) — upload a photo to find where it was taken using AI-powered visual geolocation.

## Features

- 📸 **Camera capture** — uses device camera via `getUserMedia` / `capture="environment"`
- 📁 **File upload** — pick existing photos from device
- 🗺️ **Live map** — Leaflet/OpenStreetMap with marker at predicted location
- 🏙️ **Street View** — Google Maps embed with link to Street View panorama
- 🎨 **Dark mode** — respects system preference (`prefers-color-scheme`)
- 📱 **Mobile-first** — responsive design optimized for phones

## Quick Start

### Run locally

```bash
# Serve frontend on port 8080
python3 serve.py

# Or with a custom port
python3 serve.py --port 3000
```

Open `http://localhost:8080` in a browser.

> The frontend connects to the MapSnap API at `http://localhost:8080/predict` by default.
> If the API runs on a different port/URL, set `MAPSNAP_API_BASE` before loading app.js:
> ```html
> <script>window.MAPSNAP_API_BASE = "http://localhost:8081";</script>
> <script src="config.js"></script>
> <script src="app.js"></script>
> ```

### Run with Docker

```bash
docker build -t mapsnap-frontend .
docker run -p 8080:8080 mapsnap-frontend
```

## Deploying

### Google Cloud Run (static)

```bash
# Deploy via CloudRun container
gcloud run deploy mapsnap-frontend \
  --image=gcr.io/PROJECT-ID/mapsnap-frontend \
  --platform=managed --port=8080 \
  --allow-unauthenticated

# Or use Cloud Build (see cloudbuild.yaml)
gcloud builds submit --config=cloudbuild.yaml
```

### Cloud Storage + CDN

Upload the static files to a GCS bucket and enable Cloud CDN:

```bash
gsutil -m rsync -R -d ./ gs://mapsnap-frontend-static/
```

## File Structure

```
mapsnap-frontend/
├── index.html    # Main HTML (Leaflet + custom UI)
├── style.css     # Mobile-first CSS with dark mode
├── app.js        # Application logic (camera, upload, map, API)
├── config.js     # Configurable API base URL
├── serve.py      # Python static file server (dev)
├── Dockerfile    # Container image for CloudRun
├── cloudbuild.yaml  # Cloud Build config (optional)
└── README.md     # This file
```

## API Integration

The frontend POSTs images to the MapSnap API:

```
POST /predict
Content-Type: multipart/form-data
  file: <image file> (JPEG, PNG, WebP, max 20MB)

Response:
{
  "pano_id": "xxxxx",
  "latitude": 33.65,
  "longitude": -83.97,
  "confidence": 0.85,
  "distance": 0.3,
  "top_k": [...],
  "streetview_url": "https://www.google.com/maps/@?api=1&map_action=pano&panoid=xxxxx",
  "mode": "dummy" | "real"
}
```

## License

Private — MapSnap project.
