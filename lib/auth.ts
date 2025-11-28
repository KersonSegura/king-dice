import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';
import fs from 'fs/promises';
import path from 'path';

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    isAdmin: boolean;
    level?: number;
    xp?: number;
    isVerified?: boolean;
  };
  token?: string;
  message?: string;
  requiresTwoFactor?: boolean;
  requiresVerification?: boolean; // For email verification during registration
  userId?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with its hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string | null {
  try {
    if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      console.error('❌ JWT_SECRET is not set or using default value!');
      return null;
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    console.error('❌ Error generating token:', error);
    return null;
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Authenticate user with username/email and password
 */
export async function authenticateUser(identifier: string, password: string): Promise<AuthResult> {
  try {
    console.log('🔐 authenticateUser: Starting authentication for:', identifier);
    console.log('🔐 Checking Supabase connection...');
    
    // Find user by username or email with retry logic
    console.log('🔍 Searching for user:', identifier);
    const { data: users, error } = await executeSupabaseQuery(
      () => supabaseAdmin
        .from('users')
        .select('id, username, email, avatar, passwordHash, isAdmin, level, xp, twoFactorEnabled')
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .limit(1),
      {
        maxRetries: 2,
        baseDelay: 400,
        timeout: 15000
      }
    );

    if (error) {
      console.error('❌ Supabase query error:', error);
      // Check if error message contains HTML (Cloudflare timeout page)
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html') || errorMessage.includes('timeout')) {
        return {
          success: false,
          message: 'Database connection timeout. The database may be temporarily unavailable. Please try again in a few moments.'
        };
      }
      return {
        success: false,
        message: `Database connection failed: ${errorMessage}`
      };
    }

    if (!users || users.length === 0) {
      console.log('❌ User not found:', identifier);
      return {
        success: false,
        message: 'Invalid username/email or password'
      };
    }

    const user = users[0];
    console.log('✅ User found:', user.username, 'ID:', user.id);
    
    // Check if password hash exists (for existing users without hashed passwords)
    if (!user.passwordHash) {
      console.log('❌ User has no password hash');
      return {
        success: false,
        message: 'Please reset your password to continue'
      };
    }

    console.log('🔍 Verifying password...');
    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      return {
        success: false,
        message: 'Invalid username/email or password'
      };
    }
    
    console.log('✅ Password verified');

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return {
        success: false,
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        userId: user.id
      };
    }

    // Generate token for users without 2FA
    console.log('🔑 Generating JWT token...');
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    });
    
    if (!token) {
      console.error('❌ Failed to generate token - JWT_SECRET might be missing');
      return {
        success: false,
        message: 'Authentication failed: Token generation error'
      };
    }
    
    console.log('✅ Token generated successfully');

    // Return user data (without password hash)
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '/DiceLogo.svg',
        isAdmin: user.isAdmin || false,
        level: user.level || 1,
        xp: user.xp || 0
      },
      token
    };

  } catch (error) {
    console.error('❌ Authentication error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Check if it's a Prisma connection error
    if (error instanceof Error && error.message.includes('Prisma Client')) {
      return {
        success: false,
        message: 'Database connection failed. Please try again in a moment.'
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? `Authentication error: ${error.message}` : 'Authentication failed. Please try again.'
    };
  }
}

/**
 * Register a new user
 */
export async function registerUser(username: string, email: string, password: string): Promise<AuthResult> {
  try {
    console.log('🔐 registerUser: Starting registration for:', username);
    
    // Validate input
    if (username.length < 3) {
      return {
        success: false,
        message: 'Username must be at least 3 characters'
      };
    }

    // Password requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
    if (password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one number'
      };
    }

    // Check if username already exists (case-insensitive)
    // Try camelCase first, then snake_case
    let usernameExists = false;
    const { data: usernameDataCamel, error: usernameErrorCamel } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .ilike('username', username)
      .limit(1);

    if (!usernameErrorCamel && usernameDataCamel && usernameDataCamel.length > 0) {
      usernameExists = true;
    } else {
      // Try snake_case
      const { data: usernameDataSnake, error: usernameErrorSnake } = await supabaseAdmin
        .from('users')
        .select('id, username')
        .ilike('username', username)
        .limit(1);

      if (!usernameErrorSnake && usernameDataSnake && usernameDataSnake.length > 0) {
        usernameExists = true;
      }

      if (usernameErrorSnake && usernameErrorCamel) {
        console.error('❌ registerUser: Error checking existing username:', usernameErrorCamel || usernameErrorSnake);
        const errorMessage = (usernameErrorCamel?.message || usernameErrorSnake?.message || String(usernameErrorCamel || usernameErrorSnake));
        if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html') || errorMessage.includes('timeout')) {
          return {
            success: false,
            message: 'Database connection timeout. Please try again in a few moments.'
          };
        }
        return {
          success: false,
          message: 'Database connection failed. Please try again.'
        };
      }
    }

    if (usernameExists) {
      return {
        success: false,
        message: 'Username already exists. Please choose a different username.'
      };
    }

    // Check if email already exists (case-insensitive)
    let emailExists = false;
    const { data: emailDataCamel, error: emailErrorCamel } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .limit(1);

    if (!emailErrorCamel && emailDataCamel && emailDataCamel.length > 0) {
      emailExists = true;
    } else {
      // Try snake_case
      const { data: emailDataSnake, error: emailErrorSnake } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .ilike('email', email)
        .limit(1);

      if (!emailErrorSnake && emailDataSnake && emailDataSnake.length > 0) {
        emailExists = true;
      }

      if (emailErrorSnake && emailErrorCamel) {
        console.error('❌ registerUser: Error checking existing email:', emailErrorCamel || emailErrorSnake);
        const errorMessage = (emailErrorCamel?.message || emailErrorSnake?.message || String(emailErrorCamel || emailErrorSnake));
        if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html') || errorMessage.includes('timeout')) {
          return {
            success: false,
            message: 'Database connection timeout. Please try again in a few moments.'
          };
        }
        return {
          success: false,
          message: 'Database connection failed. Please try again.'
        };
      }
    }

    if (emailExists) {
      return {
        success: false,
        message: 'Email already exists. Please use a different email address or try logging in.'
      };
    }

    // Hash password
    console.log('🔐 registerUser: Hashing password...');
    const passwordHash = await hashPassword(password);

    // Generate default avatar
    console.log('🎨 registerUser: Generating default avatar...');
    const defaultAvatar = await generateDefaultAvatar();

    // Generate CUID for user ID (similar to Prisma's default)
    const generateCuid = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      return `c${timestamp}${random}${random2}`.substring(0, 25);
    };
    
    const userId = generateCuid();

    // Create user in Supabase (unverified)
    console.log('📝 registerUser: Creating user in database...');
    const now = new Date().toISOString();
    const createResult = await executeSupabaseQuery(
      async () => {
        const result = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            username,
            email,
            passwordHash,
            avatar: defaultAvatar,
            level: 1,
            xp: 0,
            isAdmin: false,
            isVerified: false, // User must verify email
            createdAt: now,
            updatedAt: now,
            joinDate: now
          })
          .select('id, username, email, avatar, isAdmin, level, xp, isVerified')
          .single();
        return result;
      },
      { maxRetries: 2, baseDelay: 400, timeout: 15000 }
    );

    const { data: newUser, error: createError } = createResult;

    if (createError || !newUser) {
      console.error('❌ registerUser: Error creating user:', createError);
      const errorMessage = createError?.message || String(createError || '');
      
      // Check for specific database constraint errors
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint') || errorMessage.includes('already exists')) {
        if (errorMessage.toLowerCase().includes('username')) {
          return {
            success: false,
            message: 'Username already exists. Please choose a different username.'
          };
        }
        if (errorMessage.toLowerCase().includes('email')) {
          return {
            success: false,
            message: 'Email already exists. Please use a different email address or try logging in.'
          };
        }
      }
      
      if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html') || errorMessage.includes('timeout')) {
        return {
          success: false,
          message: 'Database connection timeout. Please try again in a few moments.'
        };
      }
      
      // Return more specific error if available
      if (errorMessage && errorMessage !== '[object Object]') {
        return {
          success: false,
          message: errorMessage
        };
      }
      
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }

    console.log('✅ registerUser: User created:', (newUser as any).username);

    // Generate verification code and send email
    const { emailService, generateVerificationCode } = await import('@/lib/email-service');
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Save verification code to database
    const { error: codeError } = await supabaseAdmin
      .from('two_factor_codes')
      .insert({
        userId: newUser.id,
        code: verificationCode,
        expiresAt: expiresAt,
        used: false
      });

    if (codeError) {
      console.error('❌ registerUser: Error saving verification code:', codeError);
      // Continue anyway - user can request a new code
    }

    // Send verification email
    const emailSent = await emailService.sendRegistrationVerificationCode(email, verificationCode, username);
    if (!emailSent) {
      console.error('❌ registerUser: Failed to send verification email');
      // Continue anyway - user can request a new code
    }

    // Return user data but indicate verification is required
    const userData = newUser as any;
    return {
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        avatar: userData.avatar || '/DiceLogo.svg',
        isAdmin: userData.isAdmin || false,
        level: userData.level || 1,
        xp: userData.xp || 0,
        isVerified: false
      },
      requiresVerification: true // Flag to indicate email verification is needed
    };

  } catch (error) {
    console.error('❌ registerUser: Registration error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Registration failed. Please try again.'
    };
  }
}

/**
 * Get user from token
 */
export async function getUserFromToken(token: string): Promise<AuthResult> {
  try {
    console.log('🔍 getUserFromToken: Verifying token...');
    const payload = verifyToken(token);
    if (!payload) {
      console.log('❌ getUserFromToken: Token verification failed');
      return {
        success: false,
        message: 'Invalid or expired token'
      };
    }

    console.log('✅ getUserFromToken: Token valid, fetching user:', payload.userId);

    // Get fresh user data from Supabase with retry logic
    const { data: user, error } = await executeSupabaseQuery(
      () => supabaseAdmin
        .from('users')
        .select('id, username, email, avatar, isAdmin, level, xp')
        .eq('id', payload.userId)
        .single(),
      { maxRetries: 2, baseDelay: 400, timeout: 15000 }
    );

    if (error) {
      console.error('❌ getUserFromToken: Supabase query error:', error);
      const errorMessage = error?.message || String(error || '');
      if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html') || errorMessage.includes('timeout')) {
        return {
          success: false,
          message: 'Database connection timeout. Please try again in a few moments.'
        };
      }
      return {
        success: false,
        message: `Database query failed: ${errorMessage}`
      };
    }

    if (!user) {
      console.log('❌ getUserFromToken: User not found');
      return {
        success: false,
        message: 'User not found'
      };
    }

    console.log('✅ getUserFromToken: User found:', user.username);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '/DiceLogo.svg',
        isAdmin: user.isAdmin || false,
        level: user.level || 1,
        xp: user.xp || 0
      }
    };

  } catch (error) {
    console.error('❌ getUserFromToken: Token validation error:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Invalid token'
    };
  }
}

// Generate default avatar for new users
async function generateDefaultAvatar(): Promise<string> {
  try {
    // Default dice configuration: white background, white dice, 1-2-3 pattern, no accessories
    const defaultConfig = {
      background: '/dice/Backgrounds/WhiteBackground.svg',
      dice: '/dice/Dice/WhiteDice.svg',
      pattern: '/dice/Patterns/1-2-3.svg',
      accessories: null,
      hat: null,
      item: null,
      companion: null
    };

    // Generate the composite SVG
    const compositeSvg = await generateCompositeSvg(defaultConfig);
    
    // Upload to Supabase Storage instead of filesystem
    const { uploadToStorage, STORAGE_BUCKETS } = await import('./supabase');
    const timestamp = Date.now();
    const filename = `default-avatar-${timestamp}.svg`;
    const filePath = `generated/${filename}`;
    
    // Convert SVG to buffer
    const buffer = Buffer.from(compositeSvg, 'utf-8');
    
    // Upload to Supabase Storage
    const result = await uploadToStorage(
      STORAGE_BUCKETS.DICE_DESIGNS,
      filePath,
      buffer,
      'image/svg+xml'
    );
    
    if (result.error || !result.publicUrl) {
      console.error('Error uploading default avatar to Supabase:', result.error);
      // Fallback to the simple default avatar if upload fails
      return '/DefaultDiceAvatar.svg';
    }
    
    return result.publicUrl;
    
  } catch (error) {
    console.error('Error generating default avatar:', error);
    // Fallback to the simple default avatar if generation fails
    return '/DefaultDiceAvatar.svg';
  }
}

// Helper function to generate composite SVG (copied from dice-assets API)
async function generateCompositeSvg(diceConfig: any): Promise<string> {
  const { background, dice, pattern, accessories, hat, item, companion } = diceConfig;
  
  // Helper function to load SVG content and make IDs unique
  const loadSvgContent = async (svgPath: string, layerPrefix: string): Promise<string> => {
    try {
      const fullPath = path.join(process.cwd(), 'public', svgPath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Make IDs unique by prefixing with layer prefix
      let processedContent = content.replace(/id="([^"]+)"/g, `id="${layerPrefix}-$1"`);
      processedContent = processedContent.replace(/#([^"'\s>]+)/g, `#${layerPrefix}-$1`);
      
      return processedContent;
    } catch (error) {
      console.error(`Error loading SVG ${svgPath}:`, error);
      return '';
    }
  };

  const layers: string[] = [];
  const allDefs = new Set<string>();

  // Background layer (always first)
  if (background) {
    const content = await loadSvgContent(background, 'bg');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.bg-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="bg-Background">${contentWithoutDefs}</g>`);
    }
  }

  // Dice layer
  if (dice) {
    const content = await loadSvgContent(dice, 'dice');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.dice-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="dice-Dice">${contentWithoutDefs}</g>`);
    }
  }

  // Pattern layer
  if (pattern) {
    const content = await loadSvgContent(pattern, 'pattern');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.pattern-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="pattern-Pattern">${contentWithoutDefs}</g>`);
    }
  }

  // Accessories layer
  if (accessories) {
    const content = await loadSvgContent(accessories, 'acc');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.acc-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="acc-Accessories">${contentWithoutDefs}</g>`);
    }
  }

  // Hat layer
  if (hat) {
    const content = await loadSvgContent(hat, 'hat');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.hat-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="hat-Hat">${contentWithoutDefs}</g>`);
    }
  }

  // Item layer
  if (item) {
    const content = await loadSvgContent(item, 'item');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.item-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="item-Item">${contentWithoutDefs}</g>`);
    }
  }

  // Companion layer
  if (companion) {
    const content = await loadSvgContent(companion, 'comp');
    if (content) {
      const defsMatch = content.match(/<defs>([\s\S]*?)<\/defs>/i);
      if (defsMatch) {
        let defsContent = defsMatch[1];
        defsContent = defsContent.replace(/\.cls-(\d+)/g, `.comp-cls-$1`);
        allDefs.add(defsContent);
      }
      const contentWithoutDefs = content.replace(/<defs>[\s\S]*?<\/defs>/i, '');
      layers.push(`<g id="comp-Companion">${contentWithoutDefs}</g>`);
    }
  }

  // Combine all layers into final SVG
  const defsSection = Array.from(allDefs).join('\n');
  const layersSection = layers.join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1000 1000">
  <defs>
    ${defsSection}
  </defs>
  ${layersSection}
</svg>`;
}
