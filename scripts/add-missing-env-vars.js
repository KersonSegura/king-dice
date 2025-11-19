#!/usr/bin/env node

/**
 * Add missing NEXT_PUBLIC_* environment variables to .env.local
 * Run with: node scripts/add-missing-env-vars.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

// Read existing .env.local
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.log('📝 Creating new .env.local file...\n');
}

// Parse existing variables
const existingVars = new Map();
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    existingVars.set(match[1], match[2]);
  }
});

let needsUpdate = false;
const updates = [];

// Check and add NEXT_PUBLIC_SUPABASE_URL
if (!existingVars.has('NEXT_PUBLIC_SUPABASE_URL')) {
  if (existingVars.has('SUPABASE_URL')) {
    const supabaseUrl = existingVars.get('SUPABASE_URL');
    envContent += `\n# Public Supabase URL (for client-side)\n`;
    envContent += `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}\n`;
    updates.push('✅ Added NEXT_PUBLIC_SUPABASE_URL');
    needsUpdate = true;
  } else {
    console.log('⚠️  SUPABASE_URL not found. Please add NEXT_PUBLIC_SUPABASE_URL manually.');
  }
} else {
  updates.push('✅ NEXT_PUBLIC_SUPABASE_URL already exists');
}

// Check and add NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!existingVars.has('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
  if (existingVars.has('SUPABASE_ANON_KEY')) {
    const anonKey = existingVars.get('SUPABASE_ANON_KEY');
    envContent += `\n# Public Supabase Anon Key (for client-side)\n`;
    envContent += `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}\n`;
    updates.push('✅ Added NEXT_PUBLIC_SUPABASE_ANON_KEY');
    needsUpdate = true;
  } else {
    console.log('\n⚠️  SUPABASE_ANON_KEY not found in .env.local');
    console.log('   You need to add NEXT_PUBLIC_SUPABASE_ANON_KEY manually.');
    console.log('   Get it from: https://supabase.com/dashboard/project/yoedvavdopxhehpxsvlt/settings/api');
    console.log('   Look for "anon public" key in the API settings.\n');
  }
} else {
  updates.push('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY already exists');
}

// Write updated content
if (needsUpdate) {
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('\n📝 Updated .env.local file:\n');
  updates.forEach(update => console.log(`   ${update}`));
  console.log('\n✅ Done! Please restart your development server.');
  console.log('   Run: npm run dev (or your start command)\n');
} else {
  console.log('\n✅ All required variables are already present!\n');
  updates.forEach(update => console.log(`   ${update}`));
}

