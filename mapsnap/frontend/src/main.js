/**
 * MapSnap Frontend — Vanilla JS + Leaflet
 * Mobile-first geolocation app
 */

// ============================================
// CONFIG
// ============================================

const DEFAULT_API_BASE = 'http://localhost:8000';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE || localStorage.getItem('mapsnap_api_base') || DEFAULT_API_BASE;
}

function setApiBaseUrl(url) {
  localStorage.setItem('mapsnap_api_base', url);
}

// ============================================
// DOM REFERENCES
// ============================================

const sections = {
  upload:    document.getElementById('upload-section'),
  preview:   document.getElementById('preview-section'),
  loading:   document.getElementById('loading-section'),
  results:   document.getElementById('results-section'),
  error:     document.getElementById('error-section'),
};

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const cameraInput = document.getElementById('camera-input');
const cameraBtn = document.getElementById('camera-btn');
const galleryBtn = document.getElementById('gallery-btn');
const previewImage = document.getElementById('preview-image');
const removePreviewBtn = document.getElementById('remove-preview');
const predictBtn = document.getElementById('predict-btn');
const configBtn = document.getElementById('config-btn');
const configPanel = document.getElementById('config-panel');
const configCloseBtn = document.getElementById('config-close');
const configInput = document.getElementById('api-url-input');
const configSaveBtn = document.getElementById('config-save');
const overlay = document.getElementById('overlay');
const tryAgainBtn = document.getElementById('try-again-btn');
const errorRetryBtn = document.getElementById('error-retry-btn');

// Result elements
const confidenceCard = document.getElementById('confidence-card');
const confidenceValue = document.getElementById('confidence-value');
const confidenceBar = document.getElementById('confidence-bar');
const confidenceText = document.getElementById('confidence-text');
const coordText = document.getElementById('coord-text');
const streetviewContainer = document.getElementById('streetview-container');
const errorText = document.getElementById('error-text');

// ============================================
// STATE
// ============================================

let currentFile = null;
let map = null;
let marker = null;

// ============================================
// SECTION MANAGEMENT
// ============================================

function showSection(name) {
  Object.values(sections).forEach(el => {
    el.classList.remove('active');
  });
  if (sections[name]) {
    sections[name].classList.add('active');
  }
}

// ============================================
// IMAGE PREVIEW
// ============================================

function handleImageSelect(file) {
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showError('Please select a valid image file.');
    return;
  }

  // Validate file size (20MB max)
  if (file.size > 20 * 1024 * 1024) {
    showError('Image too large. Maximum size is 20MB.');
    return;
  }

  currentFile = file;

  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    showSection('preview');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  currentFile = null;
  previewImage.src = '';
  fileInput.value = '';
  cameraInput.value = '';
  showSection('upload');
}

// ============================================
// FILE INPUT HANDLERS
// ============================================

function handleFileInput(e) {
  const file = e.target?.files?.[0];
  if (file) handleImageSelect(file);
}

// ============================================
// MAP
// ============================================

function initMap(lat, lng) {
  // Destroy existing map
  if (map) {
    map.remove();
    map = null;
  }

  // Create new map
  map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
  }).setView([lat, lng], 17);

  // Dark tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);

  // Custom marker
  const markerIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: #4f8ef7;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
  marker.bindPopup(`<b>MapSnap Match</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();

  // Invalidate size after a brief delay to ensure proper rendering
  setTimeout(() => map.invalidateSize(), 100);
}

// ============================================
// STREET VIEW
// ============================================

function renderStreetView(lat, lng, streetviewUrl) {
  streetviewContainer.innerHTML = '';

  // Use the URL from the backend if available
  if (streetviewUrl) {
    const iframe = document.createElement('iframe');
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src = streetviewUrl;
    iframe.title = 'Street View';
    streetviewContainer.appendChild(iframe);
    return;
  }

  // Fallback: Google Maps Street View embed
  const iframe = document.createElement('iframe');
  iframe.allow = 'autoplay; encrypted-media';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.src = `https://www.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}`;
  iframe.title = 'Street View';
  streetviewContainer.appendChild(iframe);
}

// ============================================
// CONFIDENCE DISPLAY
// ============================================

function renderConfidence(confidence, topK) {
  const pct = Math.round(confidence * 100);

  // Update value
  confidenceValue.textContent = `${pct}%`;
  confidenceBar.style.width = `${pct}%`;

  // Determine class
  confidenceCard.classList.remove('confidence-high', 'confidence-medium', 'confidence-low');
  if (pct >= 70) {
    confidenceCard.classList.add('confidence-high');
  } else if (pct >= 40) {
    confidenceCard.classList.add('confidence-medium');
  } else {
    confidenceCard.classList.add('confidence-low');
  }

  // Update text
  if (pct >= 70) {
    confidenceText.textContent = 'High confidence match — this looks like the right location!';
  } else if (pct >= 40) {
    confidenceText.textContent = 'Moderate match — the location is likely correct but not certain.';
  } else {
    confidenceText.textContent = 'Low confidence — results may be inaccurate. Try a different photo.';
  }

  // Top-K results
  if (topK && topK.length > 0) {
    // Show hint about top match distance
    const best = topK[0];
    if (best.distance !== undefined) {
      confidenceText.textContent += ` (Distance: ${best.distance.toFixed(4)})`;
    }
  }
}

// ============================================
// API CALL
// ============================================

async function predict(file) {
  const apiBase = getApiBaseUrl();

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBase}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Server error: ${response.status}`);
  }

  return await response.json();
}

// ============================================
// UI FLOW
// ============================================

function showLoading() {
  predictBtn.disabled = true;
  showSection('loading');
}

function hideLoading() {
  predictBtn.disabled = false;
}

function renderResults(data) {
  const { latitude, longitude, confidence, streetview_url, pano_id, top_k } = data;

  // Coordinates
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  coordText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  // Confidence
  renderConfidence(parseFloat(confidence), top_k);

  // Map
  initMap(lat, lng);

  // Street View
  renderStreetView(lat, lng, streetview_url);

  showSection('results');
  hideLoading();
}

async function startPrediction() {
  if (!currentFile) {
    showError('No image selected.');
    return;
  }

  showLoading();

  try {
    const data = await predict(currentFile);
    renderResults(data);
  } catch (err) {
    console.error('Prediction failed:', err);
    showError(err.message || 'Prediction failed. Please try again.');
  }
}

function showError(message) {
  errorText.textContent = message;
  hideLoading();
  showSection('error');
}

function goBackToUpload() {
  showSection('upload');
}

// ============================================
// CONFIG PANEL
// ============================================

function openConfig() {
  configPanel.classList.remove('hidden');
  overlay.classList.add('visible');
}

function closeConfig() {
  configPanel.classList.add('hidden');
  overlay.classList.remove('visible');
}

function saveConfig() {
  const url = configInput.value.trim();
  if (url) {
    setApiBaseUrl(url);
  }
  closeConfig();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Drop zone click → open camera
dropZone.addEventListener('click', () => {
  // Prefer camera on mobile, gallery otherwise
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.maxTouchPoints > 0) {
    cameraInput.click();
  } else {
    fileInput.click();
  }
});

// Camera button
cameraBtn.addEventListener('click', () => {
  cameraInput.click();
});

// Gallery button
galleryBtn.addEventListener('click', () => {
  fileInput.click();
});

// File input change
fileInput.addEventListener('change', handleFileInput);
cameraInput.addEventListener('change', (e) => handleFileInput(e));

// Remove preview
removePreviewBtn.addEventListener('click', clearImage);

// Predict button
predictBtn.addEventListener('click', startPrediction);

// Try again (from results)
tryAgainBtn.addEventListener('click', goBackToUpload);

// Error retry
errorRetryBtn.addEventListener('click', goBackToUpload);

// Config panel
configBtn.addEventListener('click', openConfig);
configCloseBtn.addEventListener('click', closeConfig);
overlay.addEventListener('click', closeConfig);
configSaveBtn.addEventListener('click', saveConfig);

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleImageSelect(file);
});

// Touch support for drag
dropZone.addEventListener('touchstart', () => {
  dropZone.classList.add('drag-over');
}, { passive: true });

dropZone.addEventListener('touchend', () => {
  setTimeout(() => dropZone.classList.remove('drag-over'), 200);
}, { passive: true });

// ============================================
// INIT
// ============================================

// Set default config value
configInput.value = getApiBaseUrl();

// Focus map on visibility change (for tab switching)
document.addEventListener('visibilitychange', () => {
  if (map && !document.hidden) {
    setTimeout(() => map.invalidateSize(), 100);
  }
});

console.log('MapSnap initialized');
