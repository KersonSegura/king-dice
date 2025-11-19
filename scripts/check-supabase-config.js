#!/usr/bin/env node

/**
 * Check Supabase configuration and environment variables
 * Run with: node scripts/check-supabase-config.js
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Checking Supabase Configuration...\n');

// Check environment variables
const checks = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    required: true,
    description: 'Public Supabase URL (for client-side)'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    required: true,
    description: 'Public Supabase Anon Key (for client-side)'
  },
  {
    name: 'SUPABASE_URL',
    value: process.env.SUPABASE_URL,
    required: false,
    description: 'Server-side Supabase URL (fallback)'
  },
  {
    name: 'SUPABASE_ANON_KEY',
    value: process.env.SUPABASE_ANON_KEY,
    required: false,
    description: 'Server-side Supabase Anon Key (fallback)'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: process.env.SUPABASE_SERVICE_ROLE_KEY,
    required: true,
    description: 'Supabase Service Role Key (for admin operations)'
  }
];

let allValid = true;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

checks.forEach(check => {
  const isValid = check.required ? !!check.value : true;
  const status = isValid ? '✅' : '❌';
  const required = check.required ? '(REQUIRED)' : '(optional)';
  
  console.log(`${status} ${check.name} ${required}`);
  console.log(`   Description: ${check.description}`);
  
  if (check.value) {
    // Mask sensitive values
    if (check.name.includes('KEY')) {
      const masked = check.value.substring(0, 20) + '...' + check.value.substring(check.value.length - 10);
      console.log(`   Value: ${masked}`);
    } else {
      console.log(`   Value: ${check.value}`);
    }
  } else {
    console.log(`   Value: NOT SET`);
  }
  
  if (!isValid && check.required) {
    allValid = false;
    console.log(`   ⚠️  MISSING REQUIRED VARIABLE!`);
  }
  
  console.log('');
});

// Validate URL format
if (supabaseUrl) {
  console.log('🔗 URL Validation:');
  if (supabaseUrl.includes('supabase.co')) {
    console.log('   ✅ URL appears to be a valid Supabase URL');
  } else {
    console.log('   ⚠️  URL does not appear to be a Supabase URL');
  }
  
  // Extract project reference
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    console.log(`   📦 Project Reference: ${match[1]}`);
    console.log(`   💡 Check status at: https://supabase.com/dashboard/project/${match[1]}`);
  }
  console.log('');
}

// Check for common issues
console.log('🔍 Common Issues Check:\n');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
  console.log('❌ No Supabase URL found in environment variables');
  allValid = false;
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY is missing - admin operations will fail');
  allValid = false;
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== process.env.SUPABASE_URL) {
    console.log('⚠️  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL are different');
    console.log('   This might be intentional, but ensure they point to the same project');
  }
}

// Final summary
console.log('\n' + '='.repeat(60));
if (allValid) {
  console.log('✅ All required Supabase configuration is present!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify your Supabase project is active (not paused)');
  console.log('   2. Check project status at: https://supabase.com/dashboard');
  if (match) {
    console.log(`   3. Direct link: https://supabase.com/dashboard/project/${match[1]}`);
  }
  console.log('   4. Run the database indexes migration: supabase/migrations/add_performance_indexes.sql');
  console.log('   5. Test connection: node scripts/test-supabase-connection.js');
} else {
  console.log('❌ Some required configuration is missing!');
  console.log('\n📋 Fix these issues:');
  console.log('   1. Add missing environment variables to .env.local');
  console.log('   2. Get values from: https://supabase.com/dashboard/project/[your-project]/settings/api');
  console.log('   3. Restart your development server after adding variables');
}
console.log('='.repeat(60) + '\n');

process.exit(allValid ? 0 : 1);

