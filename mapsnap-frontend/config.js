/**
 * MapSnap Frontend — Deployment Configuration
 *
 * Override MAPSNAP_API_BASE on the page to connect to a different backend:
 *   <script>window.MAPSNAP_API_BASE = "https://mapsnap-api-xxxxx.a.run.app";</script>
 *   <script src="config.js"></script>
 *   <script src="app.js"></script>
 */

(function () {
  'use strict';
  if (typeof window.MAPSNAP_API_BASE !== 'string') {
    window.MAPSNAP_API_BASE = 'http://localhost:8080';
  }
})();
