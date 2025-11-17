import { PrismaClient } from '@prisma/client';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('❌ Please set DATABASE_URL in Vercel environment variables');
  throw new Error('DATABASE_URL is required but not set. Please configure it in Vercel Settings → Environment Variables.');
}

// Validate DATABASE_URL format
if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL must start with postgresql:// or postgres://');
  console.error('❌ Current DATABASE_URL format:', process.env.DATABASE_URL.substring(0, 20) + '...');
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://');
}

// Log connection type for debugging (without exposing credentials)
const dbUrlStart = process.env.DATABASE_URL.substring(0, 20);
const directUrlStart = process.env.DIRECT_URL?.substring(0, 20) || 'not set';
console.log('🔌 DATABASE_URL type:', dbUrlStart.includes('prisma://') ? 'Data Proxy' : 'Direct PostgreSQL');
console.log('🔌 DIRECT_URL type:', directUrlStart.includes('prisma://') ? 'Data Proxy' : directUrlStart.includes('postgres') ? 'Direct PostgreSQL' : 'Not set');
console.log('🔌 Prisma engineType from schema: library (direct connection)');

// Singleton pattern for Prisma Client in serverless environments
// Prevents multiple instances and connection pool exhaustion
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DIRECT_URL if available (for direct connection), otherwise use DATABASE_URL
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Verify Prisma Client configuration
try {
  const fs = require('fs');
  const path = require('path');
  
  // Try multiple possible paths for the generated schema
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', '.prisma', 'client', 'schema.prisma'),
    path.join(process.cwd(), 'node_modules', '@prisma', 'client', 'schema.prisma'),
    path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'schema.prisma'),
    path.join(__dirname, '..', 'node_modules', '@prisma', 'client', 'schema.prisma'),
  ];
  
  let found = false;
  for (const generatedSchemaPath of possiblePaths) {
    if (fs.existsSync(generatedSchemaPath)) {
      const generatedSchema = fs.readFileSync(generatedSchemaPath, 'utf8');
      console.log('📄 Found generated schema at:', generatedSchemaPath);
      console.log('📄 Schema preview (first 500 chars):', generatedSchema.substring(0, 500));
      
      // Check for engineType (with flexible spacing)
      if (generatedSchema.includes('engineType') && generatedSchema.includes('library')) {
        console.log('✅ Generated Prisma Client has engineType = "library"');
        found = true;
        break;
      } else if (generatedSchema.includes('engineType') && generatedSchema.includes('dataproxy')) {
        console.error('❌ Generated Prisma Client has engineType = "dataproxy" (WRONG!)');
        console.error('❌ This will cause P6001 errors. Prisma Client needs to be regenerated.');
        found = true;
        break;
      } else {
        console.warn('⚠️ Could not find engineType in generated schema');
        console.warn('⚠️ Schema content:', generatedSchema.substring(0, 1000));
      }
    }
  }
  
  if (!found) {
    console.warn('⚠️ Generated Prisma Client schema not found at any of these paths:');
    possiblePaths.forEach(p => console.warn('  -', p));
  }
} catch (e) {
  console.warn('⚠️ Could not verify Prisma Client generation:', e);
  console.warn('⚠️ Error details:', e.message);
}

// Check for any environment variables that might force Data Proxy
if (process.env.PRISMA_CLIENT_ENGINE_TYPE) {
  console.warn('⚠️ PRISMA_CLIENT_ENGINE_TYPE is set to:', process.env.PRISMA_CLIENT_ENGINE_TYPE);
}
if (process.env.PRISMA_ACCELERATE_DATABASE_URL) {
  console.warn('⚠️ PRISMA_ACCELERATE_DATABASE_URL is set (this forces Data Proxy mode!)');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Explicitly set datasource to ensure we're using direct connection
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle graceful shutdown in serverless environments
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;

