import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, comparePassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, currentPassword, newPassword } = await request.json();

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find user (case-insensitive). public.users uses snake_case (password_hash).
    const fields = 'id, username, email, password_hash';
    const byUsername = await supabaseAdmin.from('users').select(fields).ilike('username', username).limit(1);
    const byEmail = await supabaseAdmin.from('users').select(fields).ilike('email', username).limit(1);

    const result = byUsername.data?.length ? byUsername : byEmail;
    const users = result.data;
    const findError = byUsername.data?.length ? null : byEmail.error;

    if (findError || !users?.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0] as { id: string; password_hash?: string | null };
    const currentHash = user.password_hash;

    if (!currentHash) {
      const newPasswordHash = await hashPassword(newPassword);
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        return NextResponse.json(
          { message: 'Password reset failed' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Password reset successfully' },
        { status: 200 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, currentHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { message: 'Password reset failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { message: 'Password reset failed' },
      { status: 500 }
    );
  }
}
