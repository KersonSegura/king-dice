/**
 * Script to convert pgbouncer connection string to direct connection
 * This ensures Prisma uses direct PostgreSQL connection instead of connection pooler
 */

const fs = require('fs');
const path = require('path');

// Read the schema file
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('🔧 Converting connection string for Prisma...');

// Convert pgbouncer URL (port 6543) to direct connection (port 5432)
// Remove pgbouncer=true and connection_limit parameters
let directUrl = databaseUrl
  .replace(':6543/', ':5432/') // Change port from 6543 (pgbouncer) to 5432 (direct)
  .replace(/[?&]pgbouncer=true/g, '') // Remove pgbouncer=true
  .replace(/[?&]connection_limit=\d+/g, '') // Remove connection_limit
  .replace(/[?&]schema=public/g, ''); // Remove schema=public (not needed for direct)

// Clean up any double ? or &
directUrl = directUrl.replace(/\?&/g, '?').replace(/&+/g, '&').replace(/[?&]$/, '');

// If DIRECT_URL is already set, use it instead
const finalUrl = process.env.DIRECT_URL || directUrl;

console.log('✅ Direct connection URL prepared');

// Update schema to use the direct URL
// We'll set it as an environment variable that Prisma can read
// But actually, we need to modify the schema to use a different approach

// Instead, let's create a .env file for Prisma generation
const envPath = path.join(__dirname, '..', '.env.prisma');
fs.writeFileSync(envPath, `DATABASE_URL="${finalUrl}"\nDIRECT_URL="${finalUrl}"\n`, 'utf8');

console.log('✅ Created .env.prisma with direct connection URL');
console.log('📝 Note: Make sure to set DIRECT_URL in Vercel environment variables with the direct connection string');

