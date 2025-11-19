#!/usr/bin/env node

/**
 * Check Supabase service health by testing each service
 * Run with: node scripts/check-supabase-health.js
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

async function checkServiceHealth() {
  console.log('🏥 Checking Supabase Service Health...\n');
  
  const services = [
    {
      name: 'Database (Postgres)',
      test: async () => {
        const start = Date.now();
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        const duration = Date.now() - start;
        
        if (error) {
          // Check for HTML error (Cloudflare timeout)
          if (error.message && (error.message.includes('<!DOCTYPE') || error.message.includes('<html'))) {
            throw new Error('Connection timeout - received HTML error page');
          }
          throw error;
        }
        return { duration, healthy: true };
      }
    },
    {
      name: 'PostgREST (REST API)',
      test: async () => {
        const start = Date.now();
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        const duration = Date.now() - start;
        
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('timeout')) {
            throw new Error('PostgREST connection timeout');
          }
          throw error;
        }
        return { duration, healthy: true };
      }
    },
    {
      name: 'Auth Service',
      test: async () => {
        const start = Date.now();
        // Test auth by trying to get session (will fail but should respond)
        try {
          const { data, error } = await supabase.auth.getSession();
          const duration = Date.now() - start;
          // Auth service is healthy if it responds (even with no session)
          return { duration, healthy: !error || error.message.includes('session') };
        } catch (error) {
          const duration = Date.now() - start;
          if (duration > 10000) {
            throw new Error('Auth service timeout');
          }
          throw error;
        }
      }
    },
    {
      name: 'Storage Service',
      test: async () => {
        const start = Date.now();
        // Test storage by listing buckets
        const { data, error } = await supabase.storage.listBuckets();
        const duration = Date.now() - start;
        
        if (error) {
          if (error.message?.includes('timeout') || duration > 10000) {
            throw new Error('Storage service timeout');
          }
          throw error;
        }
        return { duration, healthy: true, buckets: data?.length || 0 };
      }
    }
  ];

  const results = [];
  let allHealthy = true;

  for (const service of services) {
    try {
      console.log(`⏳ Testing ${service.name}...`);
      const result = await Promise.race([
        service.test(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 15 seconds')), 15000)
        )
      ]);
      
      const status = result.healthy ? '✅' : '⚠️';
      const health = result.healthy ? 'Healthy' : 'Unhealthy';
      console.log(`${status} ${service.name}: ${health} (${result.duration}ms)`);
      if (result.buckets !== undefined) {
        console.log(`   Storage buckets: ${result.buckets}`);
      }
      results.push({ service: service.name, ...result, error: null });
      
      if (!result.healthy) allHealthy = false;
    } catch (error) {
      allHealthy = false;
      console.log(`❌ ${service.name}: FAILED`);
      console.log(`   Error: ${error.message}`);
      results.push({ 
        service: service.name, 
        healthy: false, 
        error: error.message 
      });
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Health Check Summary:\n');
  
  const healthy = results.filter(r => r.healthy).length;
  const unhealthy = results.filter(r => !r.healthy).length;
  
  console.log(`✅ Healthy: ${healthy}/${services.length}`);
  console.log(`❌ Unhealthy: ${unhealthy}/${services.length}`);
  
  if (!allHealthy) {
    console.log('\n⚠️  Some services are unhealthy. Recommendations:');
    console.log('   1. Wait 5 minutes (recently restored projects need time)');
    console.log('   2. Check Supabase Dashboard for service status');
    console.log('   3. Try restarting the project in dashboard');
    console.log('   4. Check logs: Dashboard > Logs > Postgres Logs');
    console.log('   5. Contact Supabase support if issues persist');
  } else {
    console.log('\n✅ All services are healthy!');
    console.log('   You can now test your application.');
  }
  
  console.log('='.repeat(60));
  
  return allHealthy;
}

checkServiceHealth()
  .then(healthy => {
    process.exit(healthy ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });

