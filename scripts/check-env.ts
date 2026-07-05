import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment checker for Media Loader.
 *
 * This script checks whether required variables exist.
 * It must never print secret values.
 */

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_FASTAPI_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'WORKER_SECRET',
];

// Try to load .env.local manually to populate process.env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) continue;
    const key = trimmed.slice(0, firstEquals).trim();
    const value = trimmed.slice(firstEquals + 1).trim().replace(/^['"]|['"]$/g, ''); // strip optional quotes
    if (key) {
      process.env[key] = value;
    }
  }
}

let hasMissing = false;

console.log('Environment Check');
console.log('-----------------');

for (const key of required) {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    hasMissing = true;
    console.log(`${key}: Missing`);
  } else {
    // Sanity check that service role key is not accidentally leaked in client keys
    if (key.startsWith('NEXT_PUBLIC_') && (value.includes('service-role') || value.includes('service_role'))) {
      console.log(`${key}: INVALID (Service role key leaked in public variable)`);
      hasMissing = true;
    } else {
      console.log(`${key}: OK`);
    }
  }
}

console.log('-----------------');
console.log('No secret values were printed.');

if (hasMissing) {
  process.exit(1);
} else {
  process.exit(0);
}
