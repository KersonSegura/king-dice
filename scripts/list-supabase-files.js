/**
 * List all files in Supabase Storage with full paths
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function listFilesRecursive(bucket, path = '', depth = 0) {
  const indent = '  '.repeat(depth);
  
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(path, { limit: 100 });

  if (error) {
    console.error(`${indent}❌ Error listing ${path}:`, error.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log(`${indent}📁 ${path || '/'} (empty)`);
    return;
  }

  for (const file of files) {
    const fullPath = path ? `${path}/${file.name}` : file.name;
    
    if (file.id === null) {
      // It's a folder
      console.log(`${indent}📁 ${file.name}/`);
      await listFilesRecursive(bucket, fullPath, depth + 1);
    } else {
      // It's a file
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(fullPath);
      console.log(`${indent}📄 ${file.name}`);
      console.log(`${indent}   Path: ${fullPath}`);
      console.log(`${indent}   URL: ${publicUrl.data.publicUrl}`);
      
      // Test URL
      try {
        const response = await fetch(publicUrl.data.publicUrl, { method: 'HEAD' });
        console.log(`${indent}   Status: ${response.ok ? '✅' : '❌'} ${response.status}`);
      } catch (e) {
        console.log(`${indent}   Status: ❌ Error`);
      }
    }
  }
}

async function main() {
  console.log('📂 Listing all files in Supabase Storage buckets...\n');
  
  const buckets = ['gallery', 'uploads', 'rules-images', 'boardle-images', 'dice-designs'];
  
  for (const bucket of buckets) {
    console.log(`\n📦 Bucket: ${bucket}`);
    console.log('─'.repeat(60));
    await listFilesRecursive(bucket);
  }
}

main().catch(console.error);

