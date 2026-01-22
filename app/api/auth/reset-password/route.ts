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

    // Find user (case-insensitive for username/email)
    // Try username first (case-insensitive)
    let query = supabaseAdmin
      .from('users')
      .select('id, username, email, password_hash');
    
    const { data: usernameUsers, error: usernameError } = await query
      .ilike('username', username)
      .limit(1);
    
    let users, findError;
    if (!usernameError && usernameUsers && usernameUsers.length > 0) {
      users = usernameUsers;
      findError = null;
    } else {
      // If not found by username, try email (case-insensitive)
      const { data: emailUsers, error: emailError } = await supabaseAdmin
        .from('users')
        .select('id, username, email, password_hash')
        .ilike('email', username)
        .limit(1);
      users = emailUsers;
      findError = emailError;
    }

    if (findError || !users || users.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // For users without password hash (migrated users), allow reset with any current password
    if (!user.password_hash) {
      // Hash the new password
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
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
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
