#!/usr/bin/env node

/**
 * Fix Database Sequences Script
 * 
 * This script fixes auto-increment sequences in PostgreSQL that may have gotten out of sync.
 * Run this if you're getting "Unique constraint failed on the fields: (`id`)" errors.
 * 
 * Usage: node scripts/fix-db-sequences.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSequences() {
  console.log('🔧 Starting database sequence fix...\n');

  try {
    // Fix game_descriptions sequence
    console.log('📝 Fixing game_descriptions sequence...');
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('game_descriptions', 'id'),
        COALESCE((SELECT MAX(id) FROM game_descriptions), 0) + 1,
        false
      );
    `);

    // Fix game_rules sequence
    console.log('📋 Fixing game_rules sequence...');
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('game_rules', 'id'),
        COALESCE((SELECT MAX(id) FROM game_rules), 0) + 1,
        false
      );
    `);

    // Fix games sequence
    console.log('🎮 Fixing games sequence...');
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('games', 'id'),
        COALESCE((SELECT MAX(id) FROM games), 0) + 1,
        false
      );
    `);

    // Fix categories sequence
    console.log('📂 Fixing categories sequence...');
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('categories', 'id'),
        COALESCE((SELECT MAX(id) FROM categories), 0) + 1,
        false
      );
    `);

    // Fix mechanics sequence
    console.log('⚙️ Fixing mechanics sequence...');
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('mechanics', 'id'),
        COALESCE((SELECT MAX(id) FROM mechanics), 0) + 1,
        false
      );
    `);

    // Fix expansions sequence
    console.log('📦 Fixing expansions sequence...');
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('expansions', 'id'),
        COALESCE((SELECT MAX(id) FROM expansions), 0) + 1,
        false
      );
    `);

    console.log('\n✅ All sequences fixed successfully!\n');

    // Display current max IDs (sequences are now set to max_id + 1)
    console.log('Checking table IDs...');
    try {
      const results = await prisma.$queryRawUnsafe(`
        SELECT 
          'game_descriptions' as table_name,
          (SELECT MAX(id) FROM game_descriptions) as max_id,
          (SELECT last_value FROM game_descriptions_id_seq) as next_id
        UNION ALL
        SELECT 
          'game_rules',
          (SELECT MAX(id) FROM game_rules),
          (SELECT last_value FROM game_rules_id_seq)
        UNION ALL
        SELECT 
          'games',
          (SELECT MAX(id) FROM games),
          (SELECT last_value FROM games_id_seq)
        UNION ALL
        SELECT 
          'categories',
          (SELECT MAX(id) FROM categories),
          (SELECT last_value FROM categories_id_seq)
        UNION ALL
        SELECT 
          'mechanics',
          (SELECT MAX(id) FROM mechanics),
          (SELECT last_value FROM mechanics_id_seq)
      `);

      console.table(results);
    } catch (err) {
      console.log('⚠️  Could not display sequence values (this is OK)');
    }
    
    console.log('\n✨ Database is ready! Try adding a game now.\n');

  } catch (error) {
    console.error('❌ Error fixing sequences:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequences();

