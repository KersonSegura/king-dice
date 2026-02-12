/**
 * Pre-builds the iOS bundle so Expo Go on iPhone gets a fast response instead of timing out.
 * Run this AFTER "npx expo start" is ready, then scan the QR code with your iPhone.
 *
 * Usage: node scripts/warm-bundle.js
 */

const BASE = 'http://localhost:8081';
const TIMEOUT_MS = 120000; // 2 min for first bundle build

function fetchWithTimeout(url, timeoutMs) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  return fetch(url, { signal: c.signal }).finally(() => clearTimeout(t));
}

async function waitForMetro() {
  console.log('Waiting for Metro...');
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetchWithTimeout(`${BASE}/status`, 3000);
      if (r.ok) {
        console.log('Metro is ready.');
        return;
      }
    } catch (_) {
      try {
        const r2 = await fetchWithTimeout(`${BASE}/`, 3000);
        if (r2.ok) {
          console.log('Metro is ready.');
          return;
        }
      } catch (_2) {}
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Metro did not become ready. Is "npx expo start" running?');
}

async function warmBundle() {
  // Match query params Expo Go / Metro may use so the same bundle is cached
  const q = new URLSearchParams({
    platform: 'ios',
    dev: 'true',
    minify: 'false',
    hot: 'false',
    lazy: 'false',
  });
  const url = `${BASE}/node_modules/expo-router/entry.bundle?${q.toString()}`;
  console.log('Pre-building iOS bundle (this may take 1–2 minutes)...');
  try {
    const r = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const body = await r.text();
    if (body.length < 1000) throw new Error('Response too short');
    console.log('Bundle ready. You can now scan the QR code with Expo Go on your iPhone.');
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('Bundle build timed out. Try again or use Tunnel (see IPHONE_TIMEOUT_FIX.md).');
    } else {
      console.error('Warm-up failed:', e.message);
    }
    process.exit(1);
  }
}

waitForMetro()
  .then(warmBundle)
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
