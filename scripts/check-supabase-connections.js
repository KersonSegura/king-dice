#!/usr/bin/env node

/**
 * Check current Supabase connection usage
 * Based on: https://supabase.com/docs/guides/database/connection-management
 * Run with: node scripts/check-supabase-connections.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

async function checkConnections() {
  console.log('🔍 Checking Supabase Connection Usage...\n');
  
  try {
    // Query from pg_stat_activity to see live connections
    // Based on Supabase docs: https://supabase.com/docs/guides/database/connection-management
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          pg_stat_activity.pid as connection_id,
          ssl,
          datname as database,
          usename as connected_role,
          application_name,
          client_addr as IP,
          LEFT(query, 100) as query_preview,
          query_start,
          state,
          backend_start
        FROM pg_stat_ssl
        JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid
        WHERE datname = current_database()
        ORDER BY backend_start DESC
        LIMIT 50;
      `
    });

    if (error) {
      // Fallback: try direct query if RPC doesn't work
      console.log('⚠️  RPC method not available, trying alternative query...\n');
      
      // Count connections by role
      const { data: countData, error: countError } = await supabase
        .from('pg_stat_activity')
        .select('usename, count')
        .eq('datname', 'postgres');
      
      if (countError) {
        console.log('❌ Could not query connection stats directly.');
        console.log('   Error:', countError.message);
        console.log('\n💡 Try running this query in Supabase SQL Editor:');
        console.log(`
SELECT 
  pg_stat_activity.pid as connection_id,
  ssl,
  datname as database,
  usename as connected_role,
  application_name,
  client_addr as IP,
  LEFT(query, 100) as query_preview,
  query_start,
  state,
  backend_start
FROM pg_stat_ssl
JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid
WHERE datname = current_database()
ORDER BY backend_start DESC
LIMIT 50;
        `);
        return;
      }
    }

    if (data && data.length > 0) {
      console.log(`📊 Found ${data.length} active connections:\n`);
      
      // Group by role
      const byRole = {};
      data.forEach(conn => {
        const role = conn.connected_role || 'unknown';
        if (!byRole[role]) {
          byRole[role] = [];
        }
        byRole[role].push(conn);
      });

      // Show summary by role
      console.log('📈 Connections by Role:');
      Object.keys(byRole).forEach(role => {
        const count = byRole[role].length;
        const states = {};
        byRole[role].forEach(conn => {
          const state = conn.state || 'unknown';
          states[state] = (states[state] || 0) + 1;
        });
        console.log(`   ${role}: ${count} connections`);
        Object.keys(states).forEach(state => {
          console.log(`      - ${state}: ${states[state]}`);
        });
      });

      console.log('\n📋 Role Meanings (from Supabase docs):');
      console.log('   authenticator → PostgREST (Data API)');
      console.log('   supabase_auth_admin → Auth service');
      console.log('   supabase_storage_admin → Storage service');
      console.log('   postgres → Dashboard/External tools');
      console.log('   supabase_admin → Monitoring/Realtime');

      // Check for idle connections
      const idle = data.filter(c => c.state === 'idle');
      if (idle.length > 0) {
        console.log(`\n⚠️  Found ${idle.length} idle connections`);
        console.log('   These might be connection leaks. Check for:');
        console.log('   - Long-running processes');
        console.log('   - Unclosed connections');
        console.log('   - Background jobs');
      }

      // Check for active queries
      const active = data.filter(c => c.state === 'active');
      if (active.length > 0) {
        console.log(`\n🔄 Found ${active.length} active queries:`);
        active.forEach(conn => {
          console.log(`   - ${conn.connected_role}: ${conn.query_preview || 'N/A'}`);
        });
      }

    } else {
      console.log('✅ No active connections found (or query returned no data)');
    }

    // Get total connection count
    const { data: totalData, error: totalError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT count(*) as total_connections
        FROM pg_stat_activity
        WHERE datname = current_database();
      `
    });

    if (!totalError && totalData) {
      const total = totalData[0]?.total_connections || 0;
      console.log(`\n📊 Total connections: ${total}`);
      console.log('   Free tier limit: ~500 connections');
      if (total > 400) {
        console.log('   ⚠️  WARNING: Approaching connection limit!');
      }
    }

  } catch (error) {
    console.error('❌ Error checking connections:', error.message);
    console.log('\n💡 Run this query directly in Supabase SQL Editor:');
    console.log(`
SELECT 
  count(*) as total_connections,
  usename as role,
  state,
  count(*) as count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY usename, state
ORDER BY count DESC;
    `);
  }
}

checkConnections()
  .then(() => {
    console.log('\n✅ Connection check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

