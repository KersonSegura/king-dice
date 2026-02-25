import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { isUserAdmin } from '@/lib/admin-utils';

export async function requireAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value;
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const authResult = await getUserFromToken(token);
  if (!authResult.success || !authResult.user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const user = authResult.user;
  const isAdmin = user.isAdmin || isUserAdmin(user.id, user.username, user.email);
  if (!isAdmin) return { ok: false as const, status: 403, error: 'Forbidden' };

  return { ok: true as const, user };
}

