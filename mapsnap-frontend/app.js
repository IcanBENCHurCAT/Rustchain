/* ==========================================================================
   MapSnap — Frontend application logic
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Constants ---------- */
  const API_BASE = 'http://localhost:8080';
  const PREDICT_ENDPOINT = `${API_BASE}/predict`;

  /* ---------- DOM refs ---------- */
  const els = {
    // Buttons
    btnCamera:       document.getElementById('btn-camera'),
    btnUpload:       document.getElementById('btn-upload'),
    btnRetryPreview: document.getElementById('btn-retry-preview'),
    btnTryAgain:     document.getElementById('btn-try-again'),
    btnErrorRetry:   document.getElementById('btn-error-retry'),
    // File input
    fileInput:       document.getElementById('file-input'),
    // Preview
    previewContainer:document.getElementById('preview-container'),
    previewImage:    document.getElementById('preview-image'),
    // Progress
    progressBar:     document.getElementById('progress-bar'),
    progressFill:    document.getElementById('progress-fill'),
    progressText:    document.getElementById('progress-text'),
    // Loading
    loadingOverlay:  document.getElementById('loading-overlay'),
    // Cards
    captureSection:  document.getElementById('capture-section'),
    resultsSection:  document.getElementById('results-section'),
    errorSection:    document.getElementById('error-section'),
    // Results
    confidenceBadge:  document.getElementById('confidence-badge'),
    confidenceValue:  document.getElementById('confidence-value'),
    topKResults:      document.getElementById('top-k-results'),
    coordinates:      document.getElementById('coordinates'),
    coordLat:         document.getElementById('coord-lat'),
    coordLon:         document.getElementById('coord-lon'),
    // Street View
    streetview:       document.getElementById('streetview'),
    // Error
    errorMessage:     document.getElementById('error-message'),
    // Map
    mapContainer:     document.getElementById('map-container'),
  };

  /* ---------- State ---------- */
  let map = null;
  let marker = null;
  let currentLatLng = null;
  let currentStreetViewUrl = null;

  /* ==========================================================================
     Helpers
     ========================================================================== */

  function show(el)        { el.classList.remove('hidden'); }
  function hide(el)        { el.classList.add('hidden'); }
  function showAll(...els) { els.forEach(e => show(e)); }
  function hideAll(...els) { els.forEach(e => hide(e)); }

  function showLoading(showing) {
    if (showing) { show(els.loadingOverlay); }
    else         { hide(els.loadingOverlay); }
  }

  function showProgress(showing) {
    if (showing) {
      show(els.progressBar);
      els.progressFill.style.width = '0%';
    } else { hide(els.progressBar); }
  }

  function setProgress(pct, text) {
    els.progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (text) els.progressText.textContent = text;
  }

  /** Return a Leaflet LatLng object (floats, not ints). */
  function toLatLng(lat, lon) {
    return [parseFloat(lat), parseFloat(lon)];
  }

  /* ==========================================================================
     Confidence colour helpers
     ========================================================================== */

  function confidenceClass(score) {
    const s = Math.max(0, Math.min(1, score));
    if (s >= 0.7) return 'confidence-high';
    if (s >= 0.35) return 'confidence-medium';
    return 'confidence-low';
  }

  function confidenceLabel(score) {
    const s = Math.max(0, Math.min(1, score));
    if (s >= 0.7) return 'High';
    if (s >= 0.35) return 'Medium';
    return 'Low';
  }

  /* ==========================================================================
     Map setup
     ========================================================================== */

  function initMap() {
    if (map) { map.remove(); map = null; }
    map = L.map('map', {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
  }

  function updateMap(lat, lon, label) {
    const ll = toLatLng(lat, lon);

    if (!map) initMap();

    // Pan / fit
    map.setView(ll, 12, { animate: true });

    // Marker
    if (marker) map.removeLayer(marker);

    const icon = L.divIcon({
      className: 'mapsnap-marker',
      html: '<div style="font-size:28px;line-height:1;">📍</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });

    marker = L.marker(ll, { icon }).addTo(map);

    if (label) {
      marker.bindPopup(`<b>${label}</b><br>Lat: ${lat}, Lon: ${lon}`).openPopup();
    }
  }

  /* ==========================================================================
     Street View
     ========================================================================== */

  function setStreetView(lat, lon, url) {
    currentStreetViewUrl = url;

    if (url) {
      els.streetview.innerHTML =
        `<iframe src="${url}" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
      show(els.streetview.parentElement);
    } else {
      els.streetview.innerHTML = '';
      hide(els.streetview.parentElement);
    }
  }

  /* ==========================================================================
     API call
     ========================================================================== */

  async function predict(imageFile) {
    setProgress(10, 'Uploading...');

    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name || 'photo.jpg');

    const response = await fetch(PREDICT_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errMsg = `Server responded with ${response.status}`;
      try { errMsg = (await response.json()).error || errMsg; } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    return response.json();
  }

  /* ==========================================================================
     Display results
     ========================================================================== */

  function displayResults(data) {
    hide(els.loadingOverlay);
    hide(els.progressBar);

    const best = data.predictions && data.predictions.length
      ? data.predictions[0]
      : data;

    const lat  = best.lat ?? best.latitude ?? data.lat ?? data.latitude;
    const lon  = best.lon  ?? best.longitude ?? data.lon ?? data.longitude ?? data.lng;
    const conf = best.confidence ?? data.confidence ?? data.confidence_score ?? 0;
    const label = best.location ?? best.label ?? best.name ?? best.place_name ?? best.city ?? best.description ?? '';

    if (lat == null || lon == null) {
      showError('Backend returned results without GPS coordinates.');
      return;
    }

    currentLatLng = toLatLng(lat, lon);

    // Confidence badge
    const scorePct = Math.round((typeof conf === 'number' ? conf : parseFloat(conf)) * 100);
    els.confidenceBadge.className = `confidence-badge ${confidenceClass(conf)}`;
    els.confidenceValue.textContent = `${scorePct}%`;

    // Coordinates
    els.coordLat.textContent = Number(lat).toFixed(6);
    els.coordLon.textContent = Number(lon).toFixed(6);

    // Top-K
    renderTopK(data);

    // Map
    updateMap(lat, lon, label);

    // Street View (Google)
    if (data.street_view_url) {
      setStreetView(lat, lon, data.street_view_url);
    } else {
      // Fallback: try constructing a SV URL if the API returned coordinates
      // but no explicit SV URL
      if (data.prediction && data.prediction.street_view_url) {
        setStreetView(lat, lon, data.prediction.street_view_url);
      } else {
        // Best-effort: Google Maps Street View link
        const fallbackUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
        setStreetView(lat, lon, fallbackUrl);
      }
    }

    // Show results card
    hide(els.captureSection);
    hide(els.errorSection);
    show(els.resultsSection);

    // Scroll results into view
    setTimeout(() => { els.resultsSection.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }

  function renderTopK(data) {
    els.topKResults.innerHTML = '';

    // Support multiple response shapes
    let items = [];

    if (Array.isArray(data.top_k)) {
      items = data.top_k.map((item, i) => ({
        label: item.location || item.place || item.name || `Result ${i + 1}`,
        lat: item.lat || item.latitude,
        lon: item.lon || item.longitude,
        confidence: item.confidence ?? 0,
        index: i,
      }));
    } else if (Array.isArray(data.predictions)) {
      items = data.predictions.map((item, i) => ({
        label: item.location || item.place || item.name || `Result ${i + 1}`,
        lat: item.lat || item.latitude,
        lon: item.lon || item.longitude,
        confidence: item.confidence ?? 0,
        index: i,
      }));
    }

    if (!items.length) return;

    items.slice(0, 5).forEach(item => {
      const el = document.createElement('div');
      el.className = 'top-k-item';
      const pct = Math.round((item.confidence || 0) * 100);
      el.innerHTML = `
        <span><span class="rank">#${item.index + 1}</span> ${item.label}</span>
        <span class="score">${pct}%</span>
      `;
      // Click to fly to that location
      if (item.lat != null && item.lon != null) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          updateMap(item.lat, item.lon, item.label);
        });
      }
      els.topKResults.appendChild(el);
    });
  }

  /* ==========================================================================
     Error handling
     ========================================================================== */

  function showError(msg) {
    hide(els.loadingOverlay);
    hide(els.progressBar);
    hide(els.resultsSection);
    els.errorMessage.textContent = msg || 'Something went wrong. Please try again.';
    show(els.errorSection);
  }

  /* ==========================================================================
     Reset / Try Again
     ========================================================================== */

  function resetUI() {
    // Clear map
    if (map) { map.remove(); map = null; }
    marker = null;
    currentLatLng = null;
    currentStreetViewUrl = null;

    // Clear form
    els.fileInput.value = '';
    els.previewImage.src = '';
    els.previewImage.alt = '';

    // Hide cards
    hide(els.resultsSection);
    hide(els.errorSection);
    hide(els.loadingOverlay);
    hide(els.progressBar);
    hide(els.previewContainer);

    // Hide top-k / coordinates / streetview
    els.topKResults.innerHTML = '';
    els.coordLat.textContent = '—';
    els.coordLon.textContent = '—';
    els.streetview.innerHTML = '';

    // Show capture section
    show(els.captureSection);
  }

  /* ==========================================================================
     Upload handling
     ========================================================================== */

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError('File is too large. Max size is 20 MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      els.previewImage.src = e.target.result;
      show(els.previewContainer);
    };
    reader.readAsDataURL(file);

    // Start upload
    try {
      showLoading(true);
      setProgress(5, 'Processing...');

      const result = await predict(file);
      displayResults(result);
    } catch (err) {
      console.error('Prediction failed:', err);
      showError(err.message || 'Failed to get a prediction. Is the backend running on localhost:8080?');
    }
  }

  /* ==========================================================================
     Event listeners
     ========================================================================== */

  // Open camera → trigger file input with capture
  els.btnCamera.addEventListener('click', () => {
    // The `capture="environment"` on the file input already enables camera
    els.fileInput.removeAttribute('capture');
    els.fileInput.setAttribute('capture', 'environment');
    els.fileInput.click();
  });

  // Upload photo → open file picker (no camera capture needed)
  els.btnUpload.addEventListener('click', () => {
    els.fileInput.removeAttribute('capture');
    els.fileInput.click();
  });

  // File input change (both camera and picker end up here)
  els.fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
  });

  // Remove preview & reset
  els.btnRetryPreview.addEventListener('click', () => {
    els.fileInput.value = '';
    hide(els.previewContainer);
  });

  // Try again
  els.btnTryAgain.addEventListener('click', () => {
    resetUI();
  });

  // Error retry
  els.btnErrorRetry.addEventListener('click', () => {
    resetUI();
  });

  /* ==========================================================================
     Init
     ========================================================================== */

  // Pre-initialise map so it renders correctly after being shown
  setTimeout(() => {
    initMap();
    if (map) map.invalidateSize();
  }, 300);

  // Handle window resize (Leaflet needs size recalc)
  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });

})();
