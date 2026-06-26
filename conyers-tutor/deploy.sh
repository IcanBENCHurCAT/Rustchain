#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Conyers Tutor — Cloud Run Deploy Script
# ═══════════════════════════════════════════════════════════════════════════
# Builds and deploys both the PWA frontend and proxy service to GCP Cloud Run.
#
# Usage:
#   ./deploy.sh                    # Deploy both services using .env
#   ./deploy.sh --frontend-only    # Deploy only the frontend
#   ./deploy.sh --proxy-only       # Deploy only the proxy
#   ./deploy.sh --destroy          # Rollback last deployment
#
# Environment:
#   Reads from .env file in the project root (auto-discovered from this script)
#   .env.example documents all required variables
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker installed and running
#   - .env file with GEMINI_API_KEY and CLOUDFLARE_TURNSTILE_SITE_KEY
#   - GCP project configured (gcloud config set project <PROJECT_ID>)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Auto-detect project root ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# ── Configuration ─────────────────────────────────────────────────────
REGION="${REGION:-us-central1}"
MEMORY="${MEMORY:-1Gi}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-10}"
TIMEOUT="${TIMEOUT:-300s}"
CPU="${CPU:-1}"
CONCURRENCY="${CONCURRENCY:-80}"
SERVICE_ACCOUNT_KEY="${SERVICE_ACCOUNT_KEY:-}"

FRONTEND_SERVICE="${FRONTEND_SERVICE:-tutor-frontend}"
PROXY_SERVICE="${PROXY_SERVICE:-tutor-proxy}"

# ── Color helpers ─────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
header(){ echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"; echo -e "${GREEN}  $*${NC}"; echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"; }

# ── Parse arguments ───────────────────────────────────────────────────
FRONTEND_ONLY=false
PROXY_ONLY=false
DESTROY=false

for arg in "$@"; do
  case "$arg" in
    --frontend-only)  FRONTEND_ONLY=true ;;
    --proxy-only)     PROXY_ONLY=true ;;
    --destroy)        DESTROY=true ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --frontend-only    Deploy only the PWA frontend"
      echo "  --proxy-only       Deploy only the proxy service"
      echo "  --destroy          Rollback last deployment (undeploy)"
      echo "  --help             Show this help message"
      echo ""
      echo "Environment:"
      echo "  REGION             GCP region (default: us-central1)"
      echo "  MEMORY             Memory (default: 1Gi)"
      echo "  MIN_INSTANCES      Min instances (default: 0)"
      echo "  MAX_INSTANCES      Max instances (default: 10)"
      echo "  FRONTEND_SERVICE   Frontend service name (default: tutor-frontend)"
      echo "  PROXY_SERVICE      Proxy service name (default: tutor-proxy)"
      exit 0
      ;;
  esac
done

# ── Determine which services to deploy ────────────────────────────────
deploy_frontend=$FRONTEND_ONLY
deploy_proxy=$PROXY_ONLY

if ! $FRONTEND_ONLY && ! $PROXY_ONLY; then
  deploy_frontend=true
  deploy_proxy=true
fi

if $DESTROY; then
  error "Destroy mode not yet implemented."
  error "To remove services, run:"
  error "  gcloud run services delete $FRONTEND_SERVICE --region=$REGION --platform=managed"
  error "  gcloud run services delete $PROXY_SERVICE --region=$REGION --platform=managed"
  exit 1
fi

# ── Pre-flight checks ────────────────────────────────────────────────
header "Pre-flight checks"

# Check gcloud
if ! command -v gcloud &>/dev/null; then
  error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
info "gcloud CLI found: $(gcloud version 2>/dev/null | head -1)"

# Check Docker
if ! command -v docker &>/dev/null; then
  error "Docker not found. Install from: https://docs.docker.com/get-docker/"
  exit 1
fi
info "Docker found: $(docker --version)"

# Check .env file
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$PROJECT_ROOT/.env.example" ]; then
    warn ".env file not found. Copy .env.example to .env and fill in your values:"
    warn "  cp .env.example .env"
    exit 1
  fi
  error ".env.example not found either. Cannot proceed."
  exit 1
fi
info "Environment file found: $ENV_FILE"

# Check required env vars
if ! grep -q '^GEMINI_API_KEY=' "$ENV_FILE" 2>/dev/null || [ -z "$(grep '^GEMINI_API_KEY=' "$ENV_FILE" | cut -d= -f2)" ]; then
  error "GEMINI_API_KEY not set in .env"
  exit 1
fi
info "GEMINI_API_KEY is set"

if grep -q '^CLOUDFLARE_TURNSTILE_SITE_KEY=' "$ENV_FILE" 2>/dev/null; then
  TURNSTILE_KEY=$(grep '^CLOUDFLARE_TURNSTILE_SITE_KEY=' "$ENV_FILE" | cut -d= -f2)
  if [ -n "$TURNSTILE_KEY" ]; then
    info "CLOUDFLARE_TURNSTILE_SITE_KEY is set"
  else
    warn "CLOUDFLARE_TURNSTILE_SITE_KEY is empty (optional)"
  fi
fi

# Check source directories exist
if $deploy_proxy; then
  if [ ! -d "$PROJECT_ROOT/cybers-tutor-proxy" ]; then
    error "cybers-tutor-proxy directory not found at: $PROJECT_ROOT/cybers-tutor-proxy"
    exit 1
  fi
  info "Proxy source found"
fi

if $deploy_frontend; then
  if [ ! -d "$PROJECT_ROOT/cybers-tutor-frontend" ]; then
    error "cybers-tutor-frontend directory not found at: $PROJECT_ROOT/cybers-tutor-frontend"
    exit 1
  fi
  info "Frontend source found"
fi

# Check GCP project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
  error "No GCP project configured. Run: gcloud config set project <YOUR_PROJECT_ID>"
  exit 1
fi
info "GCP project: $PROJECT_ID"

# ── Helper: Read env var from .env file ──────────────────────────────
get_env() {
  local var_name="$1"
  grep "^${var_name}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || echo ""
}

# ── Helper: Verify health endpoint ────────────────────────────────────
verify_health() {
  local service_name="$1"
  local region="$2"
  local max_wait=90
  local waited=0

  info "Waiting for $service_name to become healthy..."

  while [ $waited -lt $max_wait ]; do
    local url
    url=$(gcloud run services describe "$service_name" \
      --region="$region" --platform=managed \
      --format='value(status.url)' 2>/dev/null) || true

    if [ -n "$url" ]; then
      # Cloud Run adds the URL with https:// prefix, strip for wget
      local health_url="https://${url}/health"

      if response=$(wget -qO- --timeout=5 "$health_url" 2>&1); then
        if echo "$response" | grep -q '"ok"'; then
          info "$service_name is healthy: $url/health"
          return 0
        fi
      fi
    fi

    sleep 5
    waited=$((waited + 5))
    if [ $((waited % 15)) -eq 0 ]; then
      info "Still waiting... ($waited/$max_wait seconds)"
    fi
  done

  warn "Health check timed out after ${max_wait}s. Check Cloud Run console:"
  warn "  https://console.cloud.google.com/run/detail/${region}/${service_name}"
  return 1
}

# ═══════════════════════════════════════════════════════════════════════
# Deploy: Frontend (PWA)
# ═══════════════════════════════════════════════════════════════════════
if $deploy_frontend; then
  header "Deploying Frontend → Cloud Run: $FRONTEND_SERVICE"

  info "Building frontend from Dockerfile.frontend..."

  # Get the proxy URL for the frontend to call
  PROXY_URL=""
  if $deploy_proxy; then
    PROXY_URL="https://${PROXY_SERVICE}-$(gcloud config get-value project 2>/dev/null).uc.a.run.app"
  else
    PROXY_URL=$(get_env "PROXY_URL" || "")
    if [ -z "$PROXY_URL" ]; then
      # Try to get existing proxy URL
      PROXY_URL=$(gcloud run services describe "$PROXY_SERVICE" \
        --region="$REGION" --platform=managed \
        --format='value(status.url)' 2>/dev/null) || true
      PROXY_URL="${PROXY_URL#https://}"
      PROXY_URL="https://${PROXY_URL}"
    fi
  fi

  if [ -z "$PROXY_URL" ]; then
    warn "Could not determine proxy URL; frontend may not find the API."
    warn "Set PROXY_URL in .env or deploy the proxy first."
  else
    info "Frontend will proxy to: $PROXY_URL"
  fi

  # Build and deploy with gcloud run deploy
  gcloud run deploy "$FRONTEND_SERVICE" \
    --platform managed \
    --region "$REGION" \
    --source "$PROJECT_ROOT" \
    --docker-file "Dockerfile.frontend" \
    --memory "$MEMORY" \
    --cpu "$CPU" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --timeout "$TIMEOUT" \
    --allow-unauthenticated \
    --set-env-vars "VITE_PROXY_URL=${PROXY_URL}" \
    --quiet

  FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
    --region="$REGION" --platform=managed \
    --format='value(status.url)' 2>/dev/null)

  if [ -n "$FRONTEND_URL" ]; then
    info "Frontend URL: https://${FRONTEND_URL}"
    verify_health "$FRONTEND_SERVICE" "$REGION" || true
  else
    warn "Frontend deployed but URL could not be retrieved."
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# Deploy: Proxy
# ═══════════════════════════════════════════════════════════════════════
if $deploy_proxy; then
  header "Deploying Proxy → Cloud Run: $PROXY_SERVICE"

  info "Building proxy from Dockerfile.proxy..."

  # Prepare environment variables for Cloud Run
  CLOUD_RUN_ENV_FILE=$(mktemp)

  # Extract relevant env vars from .env (only those Cloud Run needs)
  grep -E '^(GEMINI_API_KEY|CLOUDFLARE_TURNSTILE_|PORT|NODE_ENV|DEV_MODE)' "$ENV_FILE" > "$CLOUD_RUN_ENV_FILE" 2>/dev/null || true
  # Add PORT if not in env file
  grep -q '^PORT=' "$ENV_FILE" 2>/dev/null || echo "PORT=3001" >> "$CLOUD_RUN_ENV_FILE"

  gcloud run deploy "$PROXY_SERVICE" \
    --platform managed \
    --region "$REGION" \
    --source "$PROJECT_ROOT" \
    --docker-file "Dockerfile.proxy" \
    --memory "$MEMORY" \
    --cpu "$CPU" \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --timeout "$TIMEOUT" \
    --concurrency "$CONCURRENCY" \
    --allow-unauthenticated \
    --env-vars-file "$CLOUD_RUN_ENV_FILE" \
    --quiet

  rm -f "$CLOUD_RUN_ENV_FILE"

  PROXY_URL=$(gcloud run services describe "$PROXY_SERVICE" \
    --region="$REGION" --platform=managed \
    --format='value(status.url)' 2>/dev/null)

  if [ -n "$PROXY_URL" ]; then
    info "Proxy URL: https://${PROXY_URL}"
    verify_health "$PROXY_SERVICE" "$REGION" || true
  else
    warn "Proxy deployed but URL could not be retrieved."
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════════════
header "Deployment complete"

if $deploy_frontend && [ -n "${FRONTEND_URL:-}" ]; then
  info "Frontend: https://${FRONTEND_URL}"
fi
if $deploy_proxy && [ -n "${PROXY_URL:-}" ]; then
  info "Proxy:     https://${PROXY_URL}"
fi

info ""
info "Next steps:"
info "  1. Visit the frontend URL in your browser"
info "  2. Test the chat: GET ${PROXY_URL:-<proxy>}/health"
info "  3. Monitor logs: gcloud run services logs tail $FRONTEND_SERVICE --region=$REGION"
info "  4. Monitor logs: gcloud run services logs tail $PROXY_SERVICE --region=$REGION"
info ""
info "To rollback: update .env, fix source code, then re-run: $0"
