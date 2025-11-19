#!/usr/bin/env node

/**
 * Simple Supabase status check - doesn't require database access
 * Run with: node scripts/check-supabase-status.js
 */

require('dotenv').config({ path: '.env.local' });

const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ Missing Supabase URL!');
  process.exit(1);
}

// Extract project reference
const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
const projectRef = match ? match[1] : null;

console.log('🔍 Checking Supabase Project Status...\n');
console.log(`📦 Project Reference: ${projectRef || 'unknown'}`);
console.log(`🔗 Project URL: ${supabaseUrl}\n`);

// Test 1: Check if REST API endpoint responds
function testRestEndpoint() {
  return new Promise((resolve) => {
    const url = new URL(supabaseUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 401) {
          // 401 is OK - means API is responding (just unauthorized)
          resolve({ success: true, status: res.statusCode, message: 'REST API is responding' });
        } else {
          resolve({ success: false, status: res.statusCode, message: `Unexpected status: ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
        resolve({ success: false, status: 0, message: 'Connection timeout (Cloudflare 522)' });
      } else {
        resolve({ success: false, status: 0, message: error.message });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, status: 0, message: 'Request timeout' });
    });

    req.end();
  });
}

// Test 2: Check Supabase status page
async function checkSupabaseStatus() {
  console.log('📊 Test Results:\n');
  
  const restTest = await testRestEndpoint();
  const status = restTest.success ? '✅' : '❌';
  console.log(`${status} REST API Endpoint: ${restTest.message}`);
  if (restTest.status) {
    console.log(`   HTTP Status: ${restTest.status}`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  if (!restTest.success) {
    console.log('❌ Supabase project is not responding');
    console.log('\n🔍 Diagnosis:');
    console.log('   The Cloudflare 522 error means:');
    console.log('   - Cloudflare can reach your project');
    console.log('   - But the Supabase database server is not responding');
    console.log('   - This is an infrastructure issue, not a code issue');
    console.log('\n📋 What to do:');
    console.log('   1. Check Supabase Status Page:');
    console.log('      https://status.supabase.com');
    console.log('   2. Check your project dashboard:');
    if (projectRef) {
      console.log(`      https://supabase.com/dashboard/project/${projectRef}`);
    }
    console.log('   3. Look for:');
    console.log('      - "Paused" or "Sleeping" status');
    console.log('      - "Unhealthy" services (Database, PostgREST)');
    console.log('      - Any error messages');
    console.log('   4. Try:');
    console.log('      - Restarting the project (if option available)');
    console.log('      - Waiting 10-15 minutes for services to initialize');
    console.log('   5. If still not working:');
    console.log('      - Contact Supabase Support');
    console.log('      - Check Supabase Discord/Community');
    console.log('      - Review project logs in dashboard');
  } else {
    console.log('✅ Supabase REST API is responding!');
    console.log('   The project appears to be online.');
    console.log('   If you\'re still having issues, check:');
    console.log('   - Database indexes (run migration)');
    console.log('   - Connection limits');
    console.log('   - Query performance');
  }
  console.log('='.repeat(60));
  
  return restTest.success;
}

checkSupabaseStatus()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

