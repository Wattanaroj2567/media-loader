# Cloudflare Quick Tunnel Launch Script for Media Loader Backend
# Usage: .\scripts\tunnel.ps1 [-Port 8000]

param (
    [int]$Port = 8000
)

$cloudflared = Get-Command cloudflared.exe -ErrorAction SilentlyContinue

if (-not $cloudflared) {
    Write-Error "cloudflared.exe was not found in PATH. Please install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting Cloudflare Quick Tunnel for Media Loader Backend" -ForegroundColor Cyan
Write-Host "  Forwarding HTTPS traffic to http://localhost:$Port" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: Copy the generated 'https://*.trycloudflare.com' URL and set it in:" -ForegroundColor Yellow
Write-Host "     Vercel Dashboard -> Settings -> Environment Variables -> NEXT_PUBLIC_FASTAPI_BASE_URL" -ForegroundColor Yellow
Write-Host ""

& $cloudflared.Source tunnel --url "http://localhost:$Port"
