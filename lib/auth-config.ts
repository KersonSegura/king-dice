import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { supabaseAdmin } from './supabase';
import { generateToken } from './auth';
import { generateDefaultAvatar } from './auth';

// Validate OAuth credentials
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn('⚠️ Google OAuth credentials not configured. Google sign-in will not work.');
}

if (!facebookClientId || !facebookClientSecret) {
  console.warn('⚠️ Facebook OAuth credentials not configured. Facebook sign-in will not work.');
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId || '',
      clientSecret: googleClientSecret || '',
      authorization: {
        params: {
          scope: 'openid email profile', // Basic scopes only - no verification needed
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
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Log immediately to ensure we see this in logs
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 SIGNIN CALLBACK CALLED');
      console.log('🔄 User email:', user?.email);
      console.log('🔄 Provider:', account?.provider);
      console.log('🔄 User object keys:', Object.keys(user || {}));
      console.log('🔄 Account object keys:', Object.keys(account || {}));
      console.log('🔄 User email exists:', !!user?.email);
      console.log('═══════════════════════════════════════════════════════');
      
      // Early return check - log if email is missing
      if (!user?.email) {
        console.error('❌ NO EMAIL IN USER OBJECT');
        console.error('❌ Full user object:', JSON.stringify(user, null, 2));
        console.error('❌ Full account object:', JSON.stringify(account, null, 2));
        return false;
      }
      
      try {

        console.log('🔍 Checking if user exists in database for email:', user.email);
        
        // Check if user already exists - only check by email for OAuth
        // Email is the unique identifier for OAuth accounts
        // Note: provider and provider_id columns may not exist yet, so we select them conditionally
        const { data: existingUser, error: findError } = await supabaseAdmin
          .from('users')
          .select('id, username, email, passwordHash, isVerified')
          .eq('email', user.email)
          .limit(1)
          .maybeSingle();

        if (findError) {
          console.error('❌ Error finding user:', findError);
          console.error('❌ Error code:', findError.code);
          console.error('❌ Error message:', findError.message);
          console.error('❌ Error details:', findError.details);
          console.error('❌ Error hint:', findError.hint);
          return false;
        }
        
        console.log('🔍 User lookup result:', existingUser ? 'User found' : 'User not found');

        const userExists = !!existingUser;
        const dbUser = existingUser;

        if (userExists && dbUser) {
          // User exists - allow sign-in
          // Note: We don't update provider info here since columns may not exist
          console.log('✅ User exists in database:', {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            hasPassword: !!dbUser.passwordHash,
          });
          
          if (dbUser.passwordHash) {
            // User has a password account - OAuth can also sign in
            console.log('✅ Signing in existing user with password account:', dbUser.username);
          } else {
            // OAuth-only account or no password
            console.log('✅ Signing in OAuth user:', dbUser.username);
          }
          
          console.log('✅ Returning true from signIn callback');
          return true;
        } else {
          // New user - create account
          console.log('📝 Creating new OAuth user:', user.email);
          
          // Generate username from email or name
          const baseUsername = user.name 
            ? user.name.toLowerCase().replace(/\s+/g, '_').substring(0, 20)
            : user.email?.split('@')[0].substring(0, 20) || 'user';
          
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
              break; // Username is available
            }
            username = `${baseUsername}${counter}`;
            counter++;
          }

          // Generate default avatar
          const defaultAvatar = await generateDefaultAvatar();

          // Create user in database
          const generateCuid = () => {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 15);
            const random2 = Math.random().toString(36).substring(2, 15);
            return `c${timestamp}${random}${random2}`.substring(0, 25);
          };
          const userId = generateCuid();
          const now = new Date().toISOString();
          
          // Store provider information
          const provider = account?.provider || 'google';
          const providerId = account?.providerAccountId || user.id || '';
          
          console.log('📝 Creating new user with data:', {
            id: userId,
            username,
            email: user.email,
            provider,
            providerId,
          });
          
          // Build user data - only include provider columns if they exist
          const userData: any = {
            id: userId,
            username,
            email: user.email,
            avatar: user.image || defaultAvatar,
            passwordHash: null, // OAuth users don't have passwords
            level: 1,
            xp: 0,
            isAdmin: false,
            isVerified: true, // OAuth emails are pre-verified
            createdAt: now,
            updatedAt: now,
            joinDate: now,
          };
          
          // Try to add provider columns if they exist (will be ignored if columns don't exist)
          // We'll handle this gracefully by trying to insert with provider, and if it fails, retry without
          
          console.log('📝 Inserting user data:', JSON.stringify(userData, null, 2));
          
          // Try to insert with provider info first
          let insertData = { ...userData, provider: provider, provider_id: providerId };
          let { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert(insertData)
            .select('id, username, email, avatar, isAdmin, level, xp, isVerified')
            .single();
          
          // If insert failed due to missing provider columns, retry without them
          if (createError && (createError.code === '42703' || createError.message?.includes('provider'))) {
            console.log('⚠️ Provider columns don\'t exist, retrying without them...');
            insertData = userData; // Remove provider columns
            const retryResult = await supabaseAdmin
              .from('users')
              .insert(insertData)
              .select('id, username, email, avatar, isAdmin, level, xp, isVerified')
              .single();
            newUser = retryResult.data;
            createError = retryResult.error;
          }

          if (createError) {
            console.error('❌ Error creating OAuth user:', createError);
            console.error('❌ Error code:', createError.code);
            console.error('❌ Error message:', createError.message);
            console.error('❌ Error details:', createError.details);
            console.error('❌ Error hint:', createError.hint);
            return false;
          }
          
          if (!newUser) {
            console.error('❌ User creation returned null/undefined');
            return false;
          }

          console.log('✅ OAuth user created successfully:', newUser.username);
          console.log('✅ Created user ID:', newUser.id);
          return true;
        }
      } catch (error) {
        console.error('═══════════════════════════════════════════════════════');
        console.error('❌ EXCEPTION IN SIGNIN CALLBACK');
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error:', error);
        if (error instanceof Error) {
          console.error('❌ Error name:', error.name);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error stack:', error.stack);
        } else {
          console.error('❌ Error (stringified):', JSON.stringify(error, null, 2));
        }
        console.error('═══════════════════════════════════════════════════════');
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        console.log('🔄 JWT callback - Initial sign in for:', user.email);
        
        try {
          // Get user from database - retry up to 3 times with delay
          // This handles the case where user was just created in signIn callback
          let dbUser = null;
          let error = null;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            const { data, error: fetchError } = await supabaseAdmin
              .from('users')
              .select('id, username, email, avatar, isAdmin, level, xp')
              .eq('email', user.email)
              .maybeSingle();

            if (!fetchError && data) {
              dbUser = data;
              error = null;
              break;
            }
            
            if (attempt < 3) {
              // Wait a bit before retrying (user might have just been created)
              await new Promise(resolve => setTimeout(resolve, 200 * attempt));
              console.log(`⏳ Retrying user fetch (attempt ${attempt + 1}/3)...`);
            } else {
              error = fetchError;
            }
          }

          if (error || !dbUser) {
            console.error('❌ Error fetching OAuth user from database after retries:', error);
            // Return token without accessToken - this will cause sign-in to fail gracefully
            return token;
          }

          // Generate JWT token compatible with existing system
          const jwtToken = generateToken({
            userId: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            isAdmin: dbUser.isAdmin || false,
          });

          console.log('✅ JWT token generated for user:', dbUser.username);
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
          console.error('❌ Exception in JWT callback:', error);
          if (error instanceof Error) {
            console.error('❌ Exception details:', error.message, error.stack);
          }
          return token;
        }
      }

      // Return previous token if the access token has not expired yet
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

