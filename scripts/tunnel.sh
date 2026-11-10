#!/usr/bin/env bash
# Cloudflare Quick Tunnel Launch Script for Media Loader Backend
# Usage: ./scripts/tunnel.sh [port] (default: 8000)

set -euo pipefail

PORT="${1:-8000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Error: cloudflared was not found in PATH." >&2
  echo "Please install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2
  exit 1
fi

echo "============================================================"
echo "  Starting Cloudflare Quick Tunnel for Media Loader Backend"
echo "  Forwarding HTTPS traffic to http://localhost:${PORT}"
echo "============================================================"
echo ""
echo "Tip: Copy the generated 'https://*.trycloudflare.com' URL and set it in:"
echo "     Vercel Dashboard -> Settings -> Environment Variables -> NEXT_PUBLIC_FASTAPI_BASE_URL"
echo ""

exec cloudflared tunnel --url "http://localhost:${PORT}"
