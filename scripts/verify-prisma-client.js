/**
 * Script to verify Prisma Client was generated correctly
 * This checks if Prisma Client is using direct connection (library engine) or Data Proxy
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Prisma Client generation...');

// Check the generated Prisma Client schema
const generatedSchemaPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'schema.prisma');

if (!fs.existsSync(generatedSchemaPath)) {
  console.error('❌ Generated Prisma Client schema not found at:', generatedSchemaPath);
  console.error('❌ Prisma Client may not have been generated. Run: npx prisma generate');
  process.exit(1);
}

const generatedSchema = fs.readFileSync(generatedSchemaPath, 'utf8');

// Check if it's using library engine (direct connection)
if (generatedSchema.includes('engineType = "library"')) {
  console.log('✅ Prisma Client generated with library engine (direct connection)');
} else if (generatedSchema.includes('engineType = "dataproxy"')) {
  console.error('❌ Prisma Client generated with Data Proxy engine!');
  console.error('❌ This will cause P6001 errors. The schema.prisma should have engineType = "library"');
  process.exit(1);
} else {
  console.warn('⚠️ Could not determine engine type from generated schema');
  console.log('Generated schema preview:', generatedSchema.substring(0, 500));
}

// Check datasource configuration
if (generatedSchema.includes('url = env("DATABASE_URL")')) {
  console.log('✅ Datasource uses DATABASE_URL');
} else {
  console.warn('⚠️ Datasource configuration may be different');
}

console.log('✅ Prisma Client verification complete');

