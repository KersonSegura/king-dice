#!/usr/bin/env node
/**
 * Test OAuth verification endpoints.
 * Run with: node scripts/test-oauth-endpoints.js
 * Requires the dev server to be running (npm run dev) or use production URL.
 *
 * These tests use invalid tokens - they verify the endpoints exist and return
 * proper error responses. Real token verification requires actual sign-in from a device.
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`Testing OAuth endpoints at ${BASE}\n`);

  let ok = 0;

  // Google: missing idToken -> 400 or 503 (if not configured)
  ok += await test('Google: missing idToken returns 400 or 503', async () => {
    const res = await fetch(`${BASE}/api/verify-google-id-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400 && res.status !== 503) throw new Error(`Expected 400 or 503, got ${res.status}`);
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    if (!data.message && !text.includes('idToken') && !text.includes('configured')) throw new Error('Expected message in response');
  });

  // Google: invalid idToken -> 400, 500, or 503 (verification fails or not configured)
  ok += await test('Google: invalid idToken returns error', async () => {
    const res = await fetch(`${BASE}/api/verify-google-id-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'invalid-token' }),
    });
    if (res.status !== 400 && res.status !== 500 && res.status !== 503) throw new Error(`Expected 400/500/503, got ${res.status}`);
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    if (!data.message && res.status < 500) throw new Error('Expected message in response');
  });

  // Apple: missing identityToken -> 400 or 503 (if not configured)
  ok += await test('Apple: missing identityToken returns 400 or 503', async () => {
    const res = await fetch(`${BASE}/api/verify-apple-id-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400 && res.status !== 503) throw new Error(`Expected 400 or 503, got ${res.status}`);
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    if (!data.message && !text.includes('identityToken') && !text.includes('configured')) throw new Error('Expected message in response');
  });

  // Apple: invalid identityToken -> 400, 500, or 503
  ok += await test('Apple: invalid identityToken returns error', async () => {
    const res = await fetch(`${BASE}/api/verify-apple-id-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityToken: 'invalid-token' }),
    });
    if (res.status !== 400 && res.status !== 500 && res.status !== 503)
      throw new Error(`Expected 400/500/503, got ${res.status}`);
    const text = await res.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    if (!data.message && res.status !== 500 && res.status !== 503) throw new Error('Expected message in response');
  });

  console.log(`\n${ok}/4 checks passed`);
  if (ok === 4) {
    console.log('\nEndpoints are wired correctly. Real token verification requires sign-in from a device.');
  }
  process.exit(ok === 4 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
