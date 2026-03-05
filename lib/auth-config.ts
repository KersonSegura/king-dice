import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
import { supabaseAdmin } from './supabase';
import { generateToken } from './auth';
import { generateDefaultAvatar } from './auth';

// Validate OAuth credentials - trim whitespace to prevent issues
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const facebookClientId = process.env.FACEBOOK_CLIENT_ID?.trim();
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET?.trim();
const appleClientId = process.env.APPLE_CLIENT_ID?.trim();
const appleClientSecret = process.env.APPLE_CLIENT_SECRET?.trim();

// Log credential status (without exposing secrets)
if (process.env.NODE_ENV === 'production') {
  console.log('🔐 OAuth Credentials Check:', {
    googleClientId: googleClientId ? `${googleClientId.substring(0, 20)}...${googleClientId.substring(googleClientId.length - 10)}` : 'NOT SET',
    googleClientSecret: googleClientSecret ? `SET (length: ${googleClientSecret.length}, ends with: ${googleClientSecret.substring(googleClientSecret.length - 4)})` : 'NOT SET',
    googleClientIdLength: googleClientId?.length || 0,
    googleClientSecretLength: googleClientSecret?.length || 0,
  });
}

if (!googleClientId || !googleClientSecret) {
  console.error('❌ Google OAuth credentials not configured. Google sign-in will not work.');
  console.error('❌ GOOGLE_CLIENT_ID:', googleClientId ? 'SET' : 'MISSING');
  console.error('❌ GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'SET' : 'MISSING');
}

if (!facebookClientId || !facebookClientSecret) {
  console.warn('⚠️ Facebook OAuth credentials not configured. Facebook sign-in will not work.');
}

if (!appleClientId || !appleClientSecret) {
  console.warn('⚠️ Apple OAuth credentials not configured. Apple sign-in will not work.');
}

async function findUserByEmailOrProvider(params: {
  email?: string | null;
  provider?: string;
  providerAccountId?: string | null;
}) {
  const email = params.email?.trim().toLowerCase();
  if (email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, avatar, isAdmin, level, xp')
      .eq('email', email)
      .maybeSingle();
    if (!error && data) return data;
  }

  if (params.provider && params.providerAccountId) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, avatar, isAdmin, level, xp')
      .eq('provider', params.provider)
      .eq('provider_id', params.providerAccountId)
      .maybeSingle();
    if (!error && data) return data;
  }

  return null;
}

async function linkProviderToExistingUser(params: {
  userId: string;
  provider?: string;
  providerAccountId?: string | null;
}) {
  if (!params.provider || !params.providerAccountId) return;
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        provider: params.provider,
        provider_id: params.providerAccountId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.userId);
    if (error && (error.code === '42703' || error.message?.includes('provider'))) {
      // Schema without provider columns: ignore, email-based linking still works.
      return;
    }
    if (error) {
      console.warn('⚠️ Could not link provider to existing user:', error.message);
    }
  } catch (e) {
    console.warn('⚠️ Exception while linking provider:', e instanceof Error ? e.message : e);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId || '',
      clientSecret: googleClientSecret || '',
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account', // Always show Google account chooser
        },
      },
    }),
    FacebookProvider({
      clientId: facebookClientId || '',
      clientSecret: facebookClientSecret || '',
      authorization: {
        params: {
          scope: 'email,public_profile',
        },
      },
      httpOptions: {
        timeout: 10000, // 10 seconds timeout for Facebook API calls
      },
    }),
    AppleProvider({
      clientId: appleClientId || '',
      clientSecret: appleClientSecret || '',
      authorization: {
        params: {
          scope: 'name email',
          response_mode: 'form_post',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Standard OAuth flow: match by email, create if doesn't exist, sign in if exists
      console.log('🔄 SIGNIN CALLBACK - Email:', user?.email, 'Provider:', account?.provider);
      
      try {
        const existingUser = await findUserByEmailOrProvider({
          email: user?.email ?? null,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId ?? null,
        });

        if (existingUser) {
          // User exists - allow sign-in (standard OAuth behavior)
          console.log('✅ User exists, allowing sign-in:', existingUser.email);
          // If the user signed in with a new OAuth provider but same email, link provider for future lookups.
          await linkProviderToExistingUser({
            userId: existingUser.id,
            provider: account?.provider,
            providerAccountId: account?.providerAccountId ?? null,
          });
          return true;
        }

        // New user creation requires an email.
        if (!user?.email) {
          console.error('❌ OAuth user has no email and no provider-linked account found');
          return false;
        }
        
        // New user - create account
        console.log('📝 Creating new OAuth user:', user.email);
        
        // Generate username from email or name
        const baseUsername = user.name 
          ? user.name.toLowerCase().replace(/\s+/g, '_').substring(0, 20)
          : user.email.split('@')[0].substring(0, 20);
        
        // Ensure username is unique
        let username = baseUsername;
        let counter = 1;
        while (true) {
          const { data: checkUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .ilike('username', username)
            .limit(1);
          
          if (!checkUser || checkUser.length === 0) {
            break;
          }
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Generate default avatar
        const defaultAvatar = await generateDefaultAvatar();

        // Create user
        const generateCuid = () => {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substring(2, 15);
          const random2 = Math.random().toString(36).substring(2, 15);
          return `c${timestamp}${random}${random2}`.substring(0, 25);
        };
        
        const userId = generateCuid();
        const now = new Date().toISOString();
        
        const userData: any = {
          id: userId,
          username,
          email: user.email,
          avatar: defaultAvatar,
          password_hash: null,
          level: 1,
          xp: 0,
          isAdmin: false,
          isVerified: true,
          createdAt: now,
          updatedAt: now,
          joinDate: now,
        };
        let { error: createError } = await supabaseAdmin
          .from('users')
          .insert({ ...userData, provider: account?.provider || 'google', provider_id: account?.providerAccountId || '' })
          .select('id')
          .single();
        if (createError && (createError.code === '42703' || createError.message?.includes('provider'))) {
          const { error: retryError } = await supabaseAdmin
            .from('users')
            .insert(userData)
            .select('id')
            .single();
          createError = retryError;
        }

        if (createError) {
          console.error('❌ Error creating user:', createError.message);
          // Still allow sign-in - user might already exist from race condition
          return true;
        }
        
        console.log('✅ New OAuth user created:', username);
        return true;
      } catch (error) {
        console.error('❌ Exception in signIn callback:', error instanceof Error ? error.message : error);
        // Allow sign-in to proceed - errors will be logged but won't block OAuth
        return true;
      }
    },
    async jwt({ token, user, account }) {
      // Initial sign in - get user from database and generate JWT
      if (account && user) {
        console.log('🔄 JWT callback - Getting user data for:', user.email || '[no-email]');
        
        try {
          // Get user from database - retry with delay if needed (user might have just been created)
          let dbUser = null;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            dbUser = await findUserByEmailOrProvider({
              email: user.email ?? null,
              provider: account.provider,
              providerAccountId: account.providerAccountId ?? null,
            });

            if (dbUser) {
              break;
            }
            
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 300 * attempt));
            } else {
              console.error('❌ Could not find user after retries');
            }
          }

          if (!dbUser) {
            console.error('❌ User not found in database for OAuth user');
            // Return token without accessToken - will be handled by session callback
            return token;
          }

          // Generate JWT token
          const jwtToken = generateToken({
            userId: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            isAdmin: dbUser.isAdmin || false,
          });

          console.log('✅ JWT token generated for:', dbUser.username);
          return {
            ...token,
            accessToken: jwtToken,
            userId: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            avatar: dbUser.avatar,
            isAdmin: dbUser.isAdmin || false,
            level: dbUser.level || 1,
            xp: dbUser.xp || 0,
          };
        } catch (error) {
          console.error('❌ Exception in JWT callback:', error instanceof Error ? error.message : error);
          return token;
        }
      }

      // Return existing token
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.userId as string,
          name: token.username as string,
          email: token.email as string,
          image: token.avatar as string,
        };
        session.accessToken = token.accessToken as string;
        session.userId = token.userId as string;
        session.username = token.username as string;
        session.isAdmin = token.isAdmin as boolean;
        session.level = token.level as number;
        session.xp = token.xp as number;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error', // Custom error page to see what went wrong
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  debug: true, // Enable debug logging always for now
  logger: {
    error(code, metadata) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ NextAuth ERROR:', code);
      console.error('❌ NextAuth ERROR metadata:', JSON.stringify(metadata, null, 2));
      console.error('═══════════════════════════════════════════════════════');
    },
    warn(code) {
      console.warn('═══════════════════════════════════════════════════════');
      console.warn('⚠️ NextAuth WARNING:', code);
      console.warn('═══════════════════════════════════════════════════════');
    },
    debug(code, metadata) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔍 NextAuth DEBUG:', code);
      if (metadata) {
        console.log('🔍 NextAuth DEBUG metadata:', JSON.stringify(metadata, null, 2));
      }
      console.log('═══════════════════════════════════════════════════════');
    },
  },
};

