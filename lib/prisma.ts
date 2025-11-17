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
  const prismaClientPath = require.resolve('@prisma/client');
  console.log('🔍 Prisma Client path:', prismaClientPath);
  
  // Check if Prisma Client was generated with Data Proxy
  const generatedClientPath = require.resolve('.prisma/client', { paths: [process.cwd()] });
  console.log('🔍 Generated Prisma Client path:', generatedClientPath);
} catch (e) {
  console.warn('⚠️ Could not verify Prisma Client paths:', e);
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

