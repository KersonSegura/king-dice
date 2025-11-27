import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, diceConfig, profileImageUrl, username } = await request.json();
    
    console.log('💾 Saving dice configuration for user:', userId);
    console.log('🎲 Dice config:', diceConfig);
    console.log('🖼️ Profile image URL:', profileImageUrl);
    console.log('👤 Username:', username);
    console.log('🔍 User ID type:', typeof userId);
    console.log('🔍 User ID length:', userId?.length);
    
    // Validate the request
    if (!userId || !diceConfig || !profileImageUrl) {
      return NextResponse.json(
        { error: 'Missing userId, diceConfig, or profileImageUrl' },
        { status: 400 }
      );
    }
    
    // Clean up old profile images for this user
    await cleanupOldProfileImages(userId, profileImageUrl);
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.log('❌ User not found by ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Found user:', user.username);
    
    // Extract title from diceConfig and convert file path to title name
    const selectedTitle = diceConfig.title;
    console.log('👑 Selected title (file path):', selectedTitle);
    
    // Extract title name from file path (e.g., "/dice/Titles/Knight.svg" -> "Knight")
    let titleName = selectedTitle;
    if (selectedTitle && selectedTitle.includes('/dice/Titles/')) {
      const pathParts = selectedTitle.split('/');
      const filename = pathParts[pathParts.length - 1]; // Get "Knight.svg"
      titleName = filename.replace('.svg', ''); // Get "Knight"
    }
    console.log('👑 Extracted title name:', titleName);
    
    // Update the user's avatar and title in the database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatar: profileImageUrl,
        title: selectedTitle ? titleName : null
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        title: true,
        isAdmin: true,
        level: true,
        xp: true
      }
    });
    
    console.log('✅ User avatar updated in database:', updatedUser.avatar);
    console.log('✅ User title updated in database:', updatedUser.title);
    console.log('✅ Dice configuration saved successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Dice configuration saved successfully',
      profileImageUrl,
      diceConfig,
      updatedUser: updatedUser
    });
    
  } catch (error) {
    console.error('❌ Error saving dice configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to clean up old profile images for a user
async function cleanupOldProfileImages(userId: string, currentImageUrl: string) {
  try {
    // On Vercel, the filesystem is read-only except for /tmp
    // We can't delete files from /public, so we'll skip cleanup on Vercel
    if (process.env.VERCEL === '1') {
      console.log('🧹 Skipping file cleanup on Vercel (read-only filesystem)');
      return;
    }

    const generatedDir = path.join(process.cwd(), 'public', 'generated');
    
    // Check if directory exists
    try {
      await fs.access(generatedDir);
    } catch {
      console.log('🧹 Generated directory does not exist, skipping cleanup');
      return;
    }
    
    // Get all files in the generated directory
    const files = await fs.readdir(generatedDir);
    
    // Filter for dice files (excluding the current one)
    const diceFiles = files.filter(file => 
      file.startsWith('dice-') && 
      file.endsWith('.svg') && 
      !file.includes(path.basename(currentImageUrl))
    );
    
    // Check which files are still referenced in the database
    const referencedFiles = new Set();
    
    // Get all user avatars that reference generated files
    const users = await prisma.user.findMany({
      select: { avatar: true }
    });
    
    users.forEach(user => {
      if (user.avatar && user.avatar.includes('/generated/dice-')) {
        const filename = path.basename(user.avatar);
        referencedFiles.add(filename);
      }
    });
    
    // Only delete files that are not referenced by any user AND are old (more than 10 files)
    const unreferencedFiles = diceFiles.filter(file => !referencedFiles.has(file));
    
    if (unreferencedFiles.length > 10) {
      // Sort by timestamp (oldest first for deletion)
      const sortedFiles = unreferencedFiles.sort((a, b) => {
        const timestampA = parseInt(a.replace('dice-', '').replace('.svg', ''));
        const timestampB = parseInt(b.replace('dice-', '').replace('.svg', ''));
        return timestampA - timestampB;
      });
      
      // Delete only the oldest unreferenced files (keep 10 most recent unreferenced)
      const filesToDelete = sortedFiles.slice(0, unreferencedFiles.length - 10);
      
      for (const file of filesToDelete) {
        try {
          const filePath = path.join(generatedDir, file);
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old unreferenced dice SVG: ${file}`);
        } catch (deleteError) {
          console.warn(`⚠️ Could not delete file ${file}:`, deleteError);
          // Continue with other files
        }
      }
    }
    
    console.log(`🧹 Cleanup completed. Kept ${diceFiles.length - Math.max(0, unreferencedFiles.length - 10)} dice SVGs.`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    // Don't fail the main operation if cleanup fails
  }
}


