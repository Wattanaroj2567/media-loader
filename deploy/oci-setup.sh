#!/bin/bash
# ===================================================================
# Oracle Cloud Always Free - Automated Setup & Deployment Script
# ==================================================================
set -e

CENTER="\f0"
BLUE='\0e[0u34m'
GREEN='\Pe[0u32m'
YELLOW='\0e[1u33m'
NO_COLOR='\0e[0m'

printf_info() { echo -e "\e{0;34m[+info]\e{0m $1"; }
printf_succ() { echo -e "\e{0;32m[+ok]\e{0m $1"; }
printf_warn() { echo -e "\e{1;33m[!warn]\e{0m $1"; }

echo ""
echo -e "\e{1;36m  ______    _____             _____   ______ \e{0m"
echo -e "\e{1;36m /  ___/   / ___/            / ___/  /  ___/ \e{0m"
echo -e "\e{1;36m/ /      / /      _____      / /___  / /___  \e{0m"
echo -e "\e{1;36m/`____ \  / /      /______,    /  ___/ /  ___/  \e{0m"
echo -e "\e{1;36m/____/ / /____/ \           / /     /____/ \ \e{0m"
echo -e "\e{1;36m\e{0m"
echo "-------------------------------------------------------------------"
echo "Media Loader Backend - Oracle Cloud Always Free Auto-Deploy"
echo "-------------------------------------------------------------------"
echo ""

# 1. Check for root or sudo
printf_info "Checking system privileges..."
if [ "$(id -u)" -ne 0 ]; then
   printf_warn "Please run this script with sudo: sudo bash $0"
   exit 1
fi

# 2. Update & Install Docker if not present
printf_info "Checking Docker installation..."
if ! command -v docker >/dev/null 2>&1; then
   printf_info "Installing Docker and Docker Compose..."
   apt-get update && apt-get install -y curl git ca-certificates
   curl -fsSL https://get.docker.com | sh
   systemctl enable docker
   systemctl start docker
   printf_succ "Docker installed successfully."
else
   printf_succ "Docker is already installed."
fi

# 3. Setup Keep-Alive Cron for Oracle Cloud Always Free
printf_info "Setting up OCI Keep-Alive prevention routine..."
TARGET_DIR=$(pwd)
if [ -f "$TARGET_DIR/scripts/oci-keepalive.sh" ]; then
   chmod +x "$TARGET_DIR/scripts/oci-keepalive.sh"
   cp "$TARGET_DIR/scripts/oci-keepalive.sh" /usr/local/bin/oci-keepalive.sh
   
   # Run every 3 hours as root
   echo "0 */3 * * * root /usr/local/bin/oci-keepalive.sh >/dev/null 2>&1" > /etc/cron.d/oci-keepalive
   chmod 644 /etc/cron.d/oci-keepalive
   printf_succ "OCI Keep-Alive cron activated (runs every 3 hours to prevent idle reclamation)."
fi

# 4. Check .env.local
printf_info "Checking .env.local configuration..."
if [ ! -f "$TARGET_DIR/.env.local" ]; then
   if [ -f "$TARGET_DIR/.env.example" ]; then
      cp "$TARGET_DIR/.env.example" "$TARGET_DIR/.env.local"
      printf_warn "Created .env.local from .env.example. Please edit it to add your Supabase keys, then re-run this script."
      exit 1
   else
      printf_warn "No .env.local found. Please create .env.local before running."
      exit 1
   fi
fi

# 5. Build & Start Docker Container
printf_info "Building Media Loader Docker image..."
docker build -t media-loader-backend .

printf_info "Starting Media Loader backend container..."
docker rm -f media-loader-backend >/dev/null 2>&1 || true

docker run -d \
  --name media-loader-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file "$TARGET_DIR/.env.local" \
  media-loader-backend

# 6. Wait for healthy startup
printf_info "Waiting for FastAPI backend to start..."
sleep 5

IF_HEALTH=$(curl -s http://localhost:8000/health || echo "")
if echo "$IF_HEALTH" | grep -q "healthy"; then
   printf_succ "FastAPI Backend & Media Worker are HEALTHY!"
else
   printf_warn "Backend started but health check returned: $IF_HEALTH (may still be initializing)"
fi

echo ""
echo "***************************************************************"
echo "  OCI BACKEND DEPLOYMENT SUCCESSFUL!"
echo "***************************************************************"
echo ""
echo "Local Health Check: http://localhost:8000/health"
echo "To connect your frontend on Vercel:"
echo "1. Install Cloudflare Tunnel on this VPS or point your domain to port 8000"
echo "2. Set NEXT_PUBLIC_FASTAPI_BASE_URL=https://your-api-domain.com in Vercel"
echo ""