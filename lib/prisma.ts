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
  
  // Try to read the generated Prisma Client schema to verify engine type
  const generatedSchemaPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client', 'schema.prisma');
  if (fs.existsSync(generatedSchemaPath)) {
    const generatedSchema = fs.readFileSync(generatedSchemaPath, 'utf8');
    if (generatedSchema.includes('engineType = "library"')) {
      console.log('✅ Generated Prisma Client has engineType = "library"');
    } else if (generatedSchema.includes('engineType = "dataproxy"')) {
      console.error('❌ Generated Prisma Client has engineType = "dataproxy" (WRONG!)');
      console.error('❌ This will cause P6001 errors. Prisma Client needs to be regenerated.');
    } else {
      console.warn('⚠️ Could not determine engine type from generated schema');
    }
  } else {
    console.warn('⚠️ Generated Prisma Client schema not found at:', generatedSchemaPath);
  }
} catch (e) {
  console.warn('⚠️ Could not verify Prisma Client generation:', e);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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

