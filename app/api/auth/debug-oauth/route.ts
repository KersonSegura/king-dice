import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Debug endpoint to test OAuth user creation and lookup
 * This helps identify database issues
 */
export async function GET(request: NextRequest) {
  try {
    const testEmail = request.nextUrl.searchParams.get('email') || 'test@example.com';
    
    console.log('🔍 Debug OAuth - Testing with email:', testEmail);
    
    // Test 1: Check if user exists (without provider columns since they may not exist)
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, passwordHash, isVerified')
      .eq('email', testEmail)
      .maybeSingle();
    
    console.log('🔍 Find user result:', { existingUser, error: findError });
    
    // Test 2: Try to insert a test user (if doesn't exist)
    let insertResult = null;
    let insertError = null;
    
    if (!existingUser) {
      const testUsername = testEmail.split('@')[0].substring(0, 20);
      const testUserId = `test_${Date.now()}`;
      const now = new Date().toISOString();
      
      // Try inserting without provider columns first (they may not exist)
      let insertData: any = {
        id: testUserId,
        username: testUsername,
        email: testEmail,
        passwordHash: null,
        level: 1,
        xp: 0,
        isAdmin: false,
        isVerified: true,
        createdAt: now,
        updatedAt: now,
        joinDate: now,
      };
      
      let { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert(insertData)
        .select('id, username, email')
        .single();
      
      // If that worked, try with provider columns (they may exist)
      if (!createError && newUser) {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ provider: 'google', provider_id: 'test_provider_id' })
          .eq('id', testUserId);
        
        if (updateError && updateError.code !== '42703') {
          // Only log if it's not a "column doesn't exist" error
          console.log('⚠️ Could not update provider columns (they may not exist):', updateError);
        }
      }
      
      insertResult = newUser;
      insertError = createError;
      
      console.log('🔍 Insert user result:', { newUser, error: createError });
      
      // Clean up test user
      if (newUser) {
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', testUserId);
      }
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        findUser: {
          success: !findError,
          error: findError ? {
            code: findError.code,
            message: findError.message,
            details: findError.details,
            hint: findError.hint,
          } : null,
          userFound: !!existingUser,
        },
        insertUser: existingUser ? {
          skipped: true,
          reason: 'User already exists',
        } : {
          success: !insertError,
          error: insertError ? {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
          } : null,
        },
      },
      database: {
        connected: true,
      },
    });
  } catch (error) {
    console.error('❌ Debug OAuth error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : String(error),
    }, { status: 500 });
  }
}
