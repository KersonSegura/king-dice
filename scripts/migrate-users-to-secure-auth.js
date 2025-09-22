/**
 * Migration script to update existing users to use secure authentication
 * This script will:
 * 1. Add passwordHash field to existing users
 * 2. Migrate users from file-based to database-based authentication
 * 3. Set up proper user levels and XP
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateUsers() {
  try {
    console.log('🔄 Starting user migration to secure authentication...');

    // Check if we have existing users in the database
    const existingUsers = await prisma.user.findMany({
      where: {
        passwordHash: null
      }
    });

    console.log(`📊 Found ${existingUsers.length} users without password hashes`);

    // For each user without a password hash, set a temporary password
    // In production, you would want to force password reset
    for (const user of existingUsers) {
      console.log(`🔧 Migrating user: ${user.username}`);
      
      // Generate a temporary password that users will need to reset
      const tempPassword = `temp_${user.username}_${Date.now()}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          level: user.level || 1,
          xp: user.xp || 0
        }
      });
      
      console.log(`✅ Updated user ${user.username} with temporary password`);
    }

    // Migrate users from file-based system if it exists
    const usersFile = path.join(__dirname, '..', 'data', 'users.json');
    
    if (fs.existsSync(usersFile)) {
      console.log('📁 Found existing users.json file, migrating...');
      
      const fileUsers = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      
      for (const fileUser of fileUsers) {
        // Check if user already exists in database
        const existingUser = await prisma.user.findUnique({
          where: { username: fileUser.username }
        });
        
        if (!existingUser) {
          console.log(`🆕 Creating new user from file: ${fileUser.username}`);
          
          // Create user with temporary password (they'll need to reset it)
          const tempPassword = `temp_${fileUser.username}_${Date.now()}`;
          const hashedPassword = await bcrypt.hash(tempPassword, 12);
          
          await prisma.user.create({
            data: {
              username: fileUser.username,
              email: fileUser.email || `${fileUser.username}@example.com`,
              passwordHash: hashedPassword,
              avatar: fileUser.avatar || '/DiceLogo.svg',
              isAdmin: fileUser.isAdmin || false,
              level: fileUser.level || 1,
              xp: fileUser.xp || 0,
              bio: fileUser.bio || null,
              favoriteGames: fileUser.favoriteGames || null,
              profileColors: fileUser.profileColors || null
            }
          });
          
          console.log(`✅ Created user ${fileUser.username} from file`);
        }
      }
      
      // Backup the old file
      const backupFile = path.join(__dirname, '..', 'data', 'users.json.backup');
      fs.copyFileSync(usersFile, backupFile);
      console.log(`💾 Backed up users.json to users.json.backup`);
    }

    console.log('🎉 User migration completed successfully!');
    console.log('⚠️  Important: All users will need to reset their passwords using the "Forgot Password" feature');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateUsers();
