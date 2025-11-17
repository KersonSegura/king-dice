/**
 * Script to verify Prisma schema has correct engineType before generation
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Prisma schema configuration...');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error('❌ Prisma schema not found at:', schemaPath);
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');

// Check for engineType = "library"
if (!schema.includes('engineType = "library"')) {
  console.error('❌ Prisma schema does not have engineType = "library"');
  console.error('❌ This is required for direct PostgreSQL connection (not Data Proxy)');
  process.exit(1);
}

// Check for datasource configuration
if (!schema.includes('datasource db')) {
  console.error('❌ Prisma schema does not have datasource db');
  process.exit(1);
}

console.log('✅ Prisma schema has engineType = "library" (direct connection)');
console.log('✅ Schema is ready for generation');
console.log('📝 Proceeding with prisma generate...');

