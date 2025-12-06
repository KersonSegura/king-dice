import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Get user's follow requests (received or sent)

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'received' or 'sent'

    if (!userId || !type) {
      return NextResponse.json({ error: 'User ID and type are required' }, { status: 400 });
    }

    if (type === 'received') {
      // Get follow requests received by this user
      // Try camelCase first (Prisma schema)
      const { data: requests, error: requestsError } = await supabaseAdmin
        .from('follow_requests')
        .select(`
          id,
          requesterId,
          targetId,
          status,
          createdAt,
          requester:users!follow_requests_requesterId_fkey (
            id,
            username,
            avatar,
            isVerified,
            isAdmin
          )
        `)
        .eq('targetId', userId)
        .eq('status', 'pending')
        .order('createdAt', { ascending: false });

      if (requestsError) {
        // Try snake_case as fallback
        const { data: requestsSnake, error: errorSnake } = await supabaseAdmin
          .from('follow_requests')
          .select(`
            id,
            requester_id,
            target_id,
            status,
            created_at,
            requester:users!follow_requests_requester_id_fkey (
              id,
              username,
              avatar,
              is_verified,
              is_admin
            )
          `)
          .eq('target_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (errorSnake) {
          console.error('Error fetching follow requests:', errorSnake);
          return NextResponse.json({ error: 'Failed to fetch follow requests' }, { status: 500 });
        }

        return NextResponse.json({
          requests: (requestsSnake || []).map((request: any) => ({
            id: request.id,
            user: {
              id: request.requester?.id,
              username: request.requester?.username,
              avatar: request.requester?.avatar,
              isVerified: request.requester?.is_verified || false,
              isAdmin: request.requester?.is_admin || false
            },
            requestedAt: request.created_at
          }))
        });
      }

      return NextResponse.json({
        requests: (requests || []).map((request: any) => ({
          id: request.id,
          user: {
            id: request.requester?.id,
            username: request.requester?.username,
            avatar: request.requester?.avatar,
            isVerified: request.requester?.isVerified || false,
            isAdmin: request.requester?.isAdmin || false
          },
          requestedAt: request.createdAt
        }))
      });
    } else if (type === 'sent') {
      // Get follow requests sent by this user
      const { data: requests, error: requestsError } = await supabaseAdmin
        .from('follow_requests')
        .select(`
          id,
          requesterId,
          targetId,
          status,
          createdAt,
          target:users!follow_requests_targetId_fkey (
            id,
            username,
            avatar,
            isVerified,
            isAdmin
          )
        `)
        .eq('requesterId', userId)
        .eq('status', 'pending')
        .order('createdAt', { ascending: false });

      if (requestsError) {
        // Try snake_case as fallback
        const { data: requestsSnake, error: errorSnake } = await supabaseAdmin
          .from('follow_requests')
          .select(`
            id,
            requester_id,
            target_id,
            status,
            created_at,
            target:users!follow_requests_target_id_fkey (
              id,
              username,
              avatar,
              is_verified,
              is_admin
            )
          `)
          .eq('requester_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (errorSnake) {
          console.error('Error fetching follow requests:', errorSnake);
          return NextResponse.json({ error: 'Failed to fetch follow requests' }, { status: 500 });
        }

        return NextResponse.json({
          requests: (requestsSnake || []).map((request: any) => ({
            id: request.id,
            user: {
              id: request.target?.id,
              username: request.target?.username,
              avatar: request.target?.avatar,
              isVerified: request.target?.is_verified || false,
              isAdmin: request.target?.is_admin || false
            },
            requestedAt: request.created_at
          }))
        });
      }

      return NextResponse.json({
        requests: (requests || []).map((request: any) => ({
          id: request.id,
          user: {
            id: request.target?.id,
            username: request.target?.username,
            avatar: request.target?.avatar,
            isVerified: request.target?.isVerified || false,
            isAdmin: request.target?.isAdmin || false
          },
          requestedAt: request.createdAt
        }))
      });
    } else {
      return NextResponse.json({ error: 'Invalid type. Use "received" or "sent"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching follow requests:', error);
    return NextResponse.json({ error: 'Failed to fetch follow requests' }, { status: 500 });
  }
}