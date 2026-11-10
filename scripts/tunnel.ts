import { spawn } from 'child_process';

/**
 * Cross-platform Cloudflare Quick Tunnel launch script for Media Loader backend.
 * Usage:
 *   pnpm tunnel [port]
 *   tsx scripts/tunnel.ts [port] (default port: 8000)
 */

const port = process.argv[2] ? parseInt(process.argv[2], 10) : 8000;
if (isNaN(port) || port <= 0 || port > 65535) {
  console.error(`Invalid port: ${process.argv[2]}. Please specify a valid port between 1 and 65535.`);
  process.exit(1);
}

const cloudflaredCmd = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';

console.log('============================================================');
console.log('  Starting Cloudflare Quick Tunnel for Media Loader Backend');
console.log(`  Forwarding HTTPS traffic to http://localhost:${port}`);
console.log('============================================================\n');
console.log("Tip: Copy the generated 'https://*.trycloudflare.com' URL and set it in:");
console.log('     Vercel Dashboard -> Settings -> Environment Variables -> NEXT_PUBLIC_FASTAPI_BASE_URL\n');

const child = spawn(cloudflaredCmd, ['tunnel', '--url', `http://localhost:${port}`], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'ENOENT') {
    console.error(`\nError: '${cloudflaredCmd}' was not found in PATH.`);
    console.error('Please install cloudflared from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n');
  } else {
    console.error(`\nError running cloudflared: ${err.message}`);
  }
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
