#!/usr/bin/env node

/**
 * Script to clear all Catan map nominations
 * This will delete all test nominations so users can start fresh
 * Run with: node scripts/clear-catan-nominations.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

async function clearNominations() {
  try {
    console.log('🗑️  Clearing all Catan map nominations...\n');
    
    // First, count current nominations
    const { count: nominationsCount } = await supabase
      .from('catan_nominations')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Current nominations in database: ${nominationsCount || 0}`);
    
    if (nominationsCount === 0) {
      console.log('✅ No nominations to clear!');
      return;
    }
    
    // Clear votes first (to avoid foreign key constraints)
    console.log('🗑️  Clearing votes...');
    try {
      const { error: votesError } = await supabase
        .from('catan_nomination_votes')
        .delete()
        .gte('id', 0);
      
      if (votesError) {
        // Try alternative table name
        const { error: votesError2 } = await supabase
          .from('catan_nominations_votes')
          .delete()
          .gte('id', 0);
        
        if (votesError2) {
          console.log('⚠️  Could not clear votes table (may not exist or already empty)');
        } else {
          console.log('✅ Cleared votes table');
        }
      } else {
        console.log('✅ Cleared votes table');
      }
    } catch (error) {
      console.log('⚠️  Could not clear votes table:', error.message);
    }
    
    // Delete all nominations
    console.log('🗑️  Deleting all nominations...');
    const { data, error } = await supabase
      .from('catan_nominations')
      .delete()
      .gte('id', 0); // Delete all (id is always >= 0)
    
    if (error) {
      console.error('❌ Error clearing nominations:', error);
      throw error;
    }
    
    // Verify deletion
    const { count: remainingCount } = await supabase
      .from('catan_nominations')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Remaining nominations: ${remainingCount || 0}`);
    
    if (remainingCount === 0) {
      console.log('✅ All nominations cleared successfully!');
      console.log(`   Deleted ${nominationsCount} nomination(s)`);
    } else {
      console.log(`⚠️  Warning: ${remainingCount} nomination(s) still remain`);
    }
    
  } catch (error) {
    console.error('❌ Error clearing nominations:', error);
    process.exit(1);
  }
}

clearNominations();
