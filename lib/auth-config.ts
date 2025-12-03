import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { supabaseAdmin } from './supabase';
import { generateToken } from './auth';
import { generateDefaultAvatar } from './auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          console.error('❌ OAuth sign-in failed: No email provided');
          return false;
        }

        // Check if user already exists
        const { data: existingUser, error: findError } = await supabaseAdmin
          .from('users')
          .select('id, username, email, passwordHash, isVerified')
          .or(`email.eq.${user.email},username.eq.${user.name || user.email?.split('@')[0]}`)
          .limit(1);

        if (findError && findError.code !== 'PGRST116') {
          console.error('❌ Error finding user:', findError);
          return false;
        }

        const userExists = existingUser && existingUser.length > 0;
        const dbUser = userExists ? existingUser[0] : null;

        if (userExists && dbUser) {
          // User exists - check if they have a password (regular account) or OAuth account
          if (dbUser.passwordHash) {
            // User has a password account - link OAuth to existing account
            console.log('✅ Linking OAuth account to existing user:', dbUser.username);
            // For now, we'll allow sign-in but could add account linking logic here
            return true;
          } else {
            // OAuth-only account, allow sign-in
            console.log('✅ OAuth user found:', dbUser.username);
            return true;
          }
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
          
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
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
              joinDate: now
            })
            .select('id, username, email, avatar, isAdmin, level, xp, isVerified')
            .single();

          if (createError || !newUser) {
            console.error('❌ Error creating OAuth user:', createError);
            return false;
          }

          console.log('✅ OAuth user created:', newUser.username);
          return true;
        }
      } catch (error) {
        console.error('❌ OAuth sign-in error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // Get user from database
        const { data: dbUser, error } = await supabaseAdmin
          .from('users')
          .select('id, username, email, avatar, isAdmin, level, xp')
          .eq('email', user.email)
          .single();

        if (error || !dbUser) {
          console.error('❌ Error fetching OAuth user:', error);
          return token;
        }

        // Generate JWT token compatible with existing system
        const jwtToken = generateToken({
          userId: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          isAdmin: dbUser.isAdmin || false,
        });

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
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};

