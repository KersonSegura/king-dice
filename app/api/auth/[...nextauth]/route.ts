import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { NextRequest } from 'next/server';

const handler = NextAuth(authOptions);

// Wrap handlers to add logging
export async function GET(request: NextRequest, context: any) {
  const url = request.url;
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 NextAuth GET request:', url);
  console.log('🔄 Search params:', request.nextUrl.searchParams.toString());
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const response = await handler(request, context);
    console.log('✅ NextAuth GET response status:', response?.status);
    return response;
  } catch (error) {
    console.error('❌ NextAuth GET error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest, context: any) {
  const url = request.url;
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 NextAuth POST request:', url);
  console.log('🔄 Search params:', request.nextUrl.searchParams.toString());
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const response = await handler(request, context);
    console.log('✅ NextAuth POST response status:', response?.status);
    return response;
  } catch (error) {
    console.error('❌ NextAuth POST error:', error);
    throw error;
  }
}

