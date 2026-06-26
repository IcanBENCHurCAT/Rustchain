# MapSnap Frontend

A mobile-first web app for visual geolocation. Upload a photo and MapSnap finds where it was taken by matching against street panoramas.

## Features

- 📸 **Camera & Upload** — Take a photo with your phone's camera or upload from gallery
- 🗺️ **Interactive Map** — See your matched location on a Leaflet map with dark theme tiles
- 🏙️ **Street View** — Preview the matched location via Google Street View
- 📊 **Confidence Score** — Visual indicator showing match confidence with color coding
- 🔄 **Try Again** — Quick re-upload for low-confidence results
- 📱 **Mobile-First** — Responsive design that works on phones (320px+) and desktops

## Tech Stack

- **Vite** — Fast build tool
- **Vanilla JavaScript** — No framework overhead
- **Leaflet.js** — Interactive maps (CDN, no API key needed)
- **CARTO Dark Tiles** — Beautiful dark map tiles

## Setup

### Prerequisites

- Node.js 18+
- MapSnap backend running on port 8000

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

This starts the dev server at `http://localhost:5173`. The app connects to the backend at `http://localhost:8000` by default.

To use a different API endpoint, open Settings (⚙️) and enter the API base URL.

### Production Build

```bash
npm run build
npm run preview
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://localhost:8000` | Backend API base URL |

Set via `.env` file or environment variables.

## Directory Structure

```
frontend/
├── index.html        # Main HTML with embedded styles
├── package.json
├── vite.config.js
└── src/
    └── main.js       # Application logic
```

## API Integration

### POST /predict

Uploads an image and returns geolocation results.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (image/jpeg, image/png, image/webp, max 20MB)

**Response:**
```json
{
  "pano_id": "string",
  "latitude": 33.680000,
  "longitude": -84.000000,
  "confidence": 0.85,
  "distance": 0.12,
  "n_results": 10,
  "top_k": [...],
  "streetview_url": "string",
  "mode": "real"
}
```

### GET /health

Health check endpoint.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (iOS 15+)
- Samsung Internet
