import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { NextRequest } from 'next/server';

const handler = NextAuth(authOptions);

// Wrap handlers to add logging
export async function GET(request: NextRequest, context: any) {
  const url = request.url;
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams.toString();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 NextAuth GET request');
  console.log('🔄 Pathname:', pathname);
  console.log('🔄 Full URL:', url);
  console.log('🔄 Search params:', searchParams);
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const response = await handler(request, context);
    console.log('✅ NextAuth GET response status:', response?.status);
    
    // Log redirect location if it's a redirect
    if (response?.status === 302 || response?.status === 307) {
      const location = response.headers.get('location');
      console.log('🔄 NextAuth redirecting to:', location);
    }
    
    return response;
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ NextAuth GET EXCEPTION');
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    console.error('═══════════════════════════════════════════════════════');
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

