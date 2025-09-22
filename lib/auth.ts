import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

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
  };
  token?: string;
  message?: string;
  requiresTwoFactor?: boolean;
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
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        passwordHash: true,
        isAdmin: true,
        level: true,
        xp: true,
        twoFactorEnabled: true
      }
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid username/email or password'
      };
    }

    // Check if password hash exists (for existing users without hashed passwords)
    if (!user.passwordHash) {
      // For backward compatibility with existing users
      // In production, you might want to force password reset
      return {
        success: false,
        message: 'Please reset your password to continue'
      };
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid username/email or password'
      };
    }

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
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    });

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
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Authentication failed. Please try again.'
    };
  }
}

/**
 * Register a new user
 */
export async function registerUser(username: string, email: string, password: string): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return {
        success: false,
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      };
    }

    // Validate input
    if (username.length < 3) {
      return {
        success: false,
        message: 'Username must be at least 3 characters'
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters'
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatar: await generateDefaultAvatar(),
        level: 1,
        xp: 0,
        isAdmin: false
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isAdmin: true,
        level: true,
        xp: true
      }
    });

    // Generate token
    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      isAdmin: newUser.isAdmin
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar || '/DiceLogo.svg',
        isAdmin: newUser.isAdmin,
        level: newUser.level || 1,
        xp: newUser.xp || 0
      },
      token
    };

  } catch (error) {
    console.error('Registration error:', error);
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
    const payload = verifyToken(token);
    if (!payload) {
      return {
        success: false,
        message: 'Invalid or expired token'
      };
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isAdmin: true,
        level: true,
        xp: true
      }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

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
    console.error('Token validation error:', error);
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
      background: '/dice/backgrounds/WhiteBackground.svg',
      dice: '/dice/dice/WhiteDice.svg',
      pattern: '/dice/patterns/1-2-3.svg',
      accessories: null,
      hat: null,
      item: null,
      companion: null
    };

    // Generate the composite SVG
    const compositeSvg = await generateCompositeSvg(defaultConfig);
    
    // Save the generated SVG
    const timestamp = Date.now();
    const filename = `default-avatar-${timestamp}.svg`;
    const outputPath = path.join(process.cwd(), 'public', 'generated', filename);
    
    // Ensure the generated directory exists
    const generatedDir = path.dirname(outputPath);
    await fs.mkdir(generatedDir, { recursive: true });
    
    // Write the SVG file
    await fs.writeFile(outputPath, compositeSvg);
    
    return `/generated/${filename}`;
    
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
