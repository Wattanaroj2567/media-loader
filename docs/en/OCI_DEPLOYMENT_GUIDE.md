# Oracle Cloud Always Free Deployment Guide

English | [ภาษาไทย](../th/OCI_DEPLOYMENT_GUIDE.md)

This guide covers deploying the **FastAPI Backend (pps/api)** and **Media Worker (pps/worker)** to **Oracle Cloud Always Free (Ampere A1 ARM)** for 100% free 24/7 operation with automatic idle reclamation protection and Cloudflare Tunnel HTTPS.

---

## 1. Always Free Instance Specifications
- **Shape**: VM.Standard.A1.Flex (Ampere ARM)
- **OCPU**: 2 to 4 OCPUs (2 or 4 recommended)
- **RAM**: 12 to 24 GB
- **OS**: Ubuntu 22.04 or 24.04 (Canonical Ubuntu)
- **Disk**: 50 - 100 GB (Always Free allows up to 200 GB)

---

## 2. Create Instance on Oracle Cloud Console
1. Log in to [Oracle Cloud Console](https://cloud.oracle.com/)
2. Go to **Compute > Instances > Create instance**
3. Name your instance (e.g. media-loader-backend)
4. Under **Placement and hardware**:
   - Click **Change shape**
   - Select **Ampere (ARM-based Processor)**
   - Check VM.Standard.A1.Flex
   - Choose 2 to 4 OCPUs and 12 to 24 GB RAM (Confirm Always Free Eligible badge)
5. Under **Image**: Select Canonical Ubuntu 22.04 or 24.04
6. Under **Add SSH keys**: Save the private key to your local machine
7. Click **Create** and wait for the status to turn green (Running)

---

## 3. Automated One-Click Setup

SSH into your Oracle VPS:
`ash
ssh -i /path/to/your-private-key.key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
`

Run the deployment commands:
`ash
# 1. Clone repository
git clone https://github.com/Wattanaroj2567/media-loader.git
cd media-loader

# 2. Configure .env.local
cp .env.example .env.local
nano .env.local
`

Add your Supabase and Worker configuration:
`ini
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
WORKER_SECRET=your-worker-secret
MEDIA_OUTPUT_MODE=local_temp
WORKER_POOL=cloud
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
`

Run the automated installer:
`ash
sudo bash deploy/oci-setup.sh
`

---

## 4. HTTPS Setup with Cloudflare Tunnel
1. Log in to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Go to **Networks > Tunnels > Add a tunnel**
3. Select **Cloudflared** and name your tunnel (e.g. media-backend)
4. Copy and run the generated Ubuntu installation command on your VPS
5. In **Public Hostname**:
   - Subdomain: pi (e.g. pi.yourdomain.com)
   - Service Type: HTTP
   - URL: localhost:8000
6. Save and test: https://api.yourdomain.com/health

---

## 5. Connect Frontend on Vercel
1. In **Vercel Dashboard > Settings > Environment Variables**
2. Update:
   - NEXT_PUBLIC_FASTAPI_BASE_URL = https://api.yourdomain.com
3. Redeploy your frontend on Vercel.
