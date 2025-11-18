/**
 * Script to convert pgbouncer connection string to direct connection URL
 * Run this to get the DIRECT_URL value to set in Vercel
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found. Please set it first.');
  process.exit(1);
}

console.log('📋 Original DATABASE_URL (first 50 chars):', databaseUrl.substring(0, 50) + '...\n');

// Convert pgbouncer URL to direct connection
// Supabase direct connections use port 5432 instead of 6543
// And we remove pgbouncer-specific parameters
let directUrl = databaseUrl
  .replace(':6543/', ':5432/') // Change port from 6543 (pgbouncer) to 5432 (direct)
  .replace(/[?&]pgbouncer=true/g, '') // Remove pgbouncer=true
  .replace(/[?&]connection_limit=\d+/g, '') // Remove connection_limit
  .replace(/[?&]schema=public/g, ''); // Remove schema=public

// Clean up any double ? or &, and trailing separators
directUrl = directUrl.replace(/\?&/g, '?').replace(/&+/g, '&').replace(/[?&]$/, '');

console.log('✅ DIRECT_URL to set in Vercel:');
console.log(directUrl);
console.log('\n📝 Instructions:');
console.log('1. Copy the DIRECT_URL above');
console.log('2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('3. Add a new variable: DIRECT_URL');
console.log('4. Paste the DIRECT_URL value');
console.log('5. Redeploy your application');

