#!/usr/bin/env node

/**
 * Test Supabase connection and query performance
 * Run with: node scripts/test-supabase-connection.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('   Run: node scripts/check-supabase-config.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

async function testConnection() {
  console.log('🧪 Testing Supabase Connection...\n');
  
  const tests = [
    {
      name: 'Connection Test',
      fn: async () => {
        const start = Date.now();
        const { data, error } = await supabase.from('users').select('count').limit(1);
        const duration = Date.now() - start;
        
        if (error) {
          // Check if it's an HTML error (Cloudflare timeout)
          if (error.message && (error.message.includes('<!DOCTYPE') || error.message.includes('<html'))) {
            throw new Error('Connection timeout - received HTML error page (Cloudflare 522). Check if project is paused.');
          }
          throw error;
        }
        
        return { success: true, duration };
      }
    },
    {
      name: 'Users Table Query',
      fn: async () => {
        const start = Date.now();
        const { data, error, count } = await supabase
          .from('users')
          .select('id, username, email', { count: 'exact' })
          .limit(10);
        const duration = Date.now() - start;
        
        if (error) throw error;
        return { success: true, duration, count: count || 0, rows: data?.length || 0 };
      }
    },
    {
      name: 'Posts Table Query',
      fn: async () => {
        const start = Date.now();
        const { data, error, count } = await supabase
          .from('posts')
          .select('id, title', { count: 'exact' })
          .limit(10);
        const duration = Date.now() - start;
        
        if (error) throw error;
        return { success: true, duration, count: count || 0, rows: data?.length || 0 };
      }
    },
    {
      name: 'Gallery Images Query',
      fn: async () => {
        const start = Date.now();
        const { data, error, count } = await supabase
          .from('gallery_images')
          .select('id, title', { count: 'exact' })
          .limit(10);
        const duration = Date.now() - start;
        
        if (error) throw error;
        return { success: true, duration, count: count || 0, rows: data?.length || 0 };
      }
    },
    {
      name: 'Games Table Query',
      fn: async () => {
        const start = Date.now();
        const { data, error, count } = await supabase
          .from('games')
          .select('id, nameEn, nameEs', { count: 'exact' })
          .limit(10);
        const duration = Date.now() - start;
        
        if (error) throw error;
        return { success: true, duration, count: count || 0, rows: data?.length || 0 };
      }
    },
    {
      name: 'User Votes Batch Query',
      fn: async () => {
        const start = Date.now();
        // Simulate batch query like in /api/games/votes/batch
        const { data, error } = await supabase
          .from('user_votes')
          .select('gameId, userId, rating')
          .limit(100);
        const duration = Date.now() - start;
        
        if (error) throw error;
        return { success: true, duration, rows: data?.length || 0 };
      }
    }
  ];

  let allPassed = true;
  const results = [];

  for (const test of tests) {
    try {
      console.log(`⏳ Running: ${test.name}...`);
      const result = await test.fn();
      results.push({ test: test.name, ...result });
      
      const duration = result.duration || 0;
      const status = duration < 1000 ? '✅' : duration < 3000 ? '⚠️' : '❌';
      console.log(`${status} ${test.name}: ${duration}ms`);
      
      if (result.count !== undefined) {
        console.log(`   Records: ${result.count} total, ${result.rows} returned`);
      } else if (result.rows !== undefined) {
        console.log(`   Records: ${result.rows} returned`);
      }
      
      if (duration > 5000) {
        console.log(`   ⚠️  Slow query! Consider adding indexes.`);
        allPassed = false;
      }
      
      console.log('');
    } catch (error) {
      allPassed = false;
      console.log(`❌ ${test.name}: FAILED`);
      console.log(`   Error: ${error.message}`);
      
      if (error.message.includes('timeout') || error.message.includes('522')) {
        console.log('\n   💡 This looks like a connection timeout issue:');
        console.log('      1. Check if your Supabase project is paused');
        console.log('      2. Visit: https://supabase.com/dashboard');
        console.log('      3. Wake up the project if it\'s sleeping');
      }
      
      console.log('');
      results.push({ test: test.name, error: error.message });
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Test Summary:\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  
  if (results.some(r => r.duration > 5000)) {
    console.log('\n⚠️  Some queries are slow (>5s):');
    results.filter(r => r.duration > 5000).forEach(r => {
      console.log(`   - ${r.test}: ${r.duration}ms`);
    });
    console.log('\n💡 Recommendation: Run the index migration:');
    console.log('   supabase/migrations/add_performance_indexes.sql');
  }
  
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;
  
  if (avgDuration) {
    console.log(`\n⏱️  Average query time: ${Math.round(avgDuration)}ms`);
  }
  
  console.log('='.repeat(60));
  
  if (!allPassed) {
    console.log('\n❌ Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All connection tests passed!');
    process.exit(0);
  }
}

// Run with timeout
const timeout = setTimeout(() => {
  console.error('\n❌ Test timeout after 30 seconds');
  console.error('   This suggests a connection issue. Check:');
  console.error('   1. Supabase project status');
  console.error('   2. Network connectivity');
  console.error('   3. Environment variables');
  process.exit(1);
}, 30000);

testConnection()
  .then(() => {
    clearTimeout(timeout);
  })
  .catch(error => {
    clearTimeout(timeout);
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

