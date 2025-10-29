/**
 * Migrate existing files to Supabase Storage
 * 
 * This script will:
 * 1. Find all existing files in public/gallery and public/uploads
 * 2. Upload them to Supabase Storage
 * 3. Keep a mapping of old paths → new URLs
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Storage buckets
const BUCKETS = {
  gallery: 'gallery',
  uploads: 'uploads',
  'rules-images': 'rules-images',
  'boardle-images': 'boardle-images'
};

/**
 * Get all files from a directory recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      // Skip non-image files (.gitkeep, .md, etc.)
      const ext = path.extname(file).toLowerCase();
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.pdf'];
      if (imageExts.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadFile(localPath, bucket, fileName) {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    
    console.log(`  📤 Uploading ${fileName} to ${bucket}...`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: getContentType(localPath),
        upsert: true
      });

    if (error) {
      console.error(`  ❌ Error uploading ${fileName}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log(`  ✅ Uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Exception uploading ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Get relative path from public/ directory
 */
function getRelativePath(fullPath) {
  const publicIndex = fullPath.indexOf('public' + path.sep);
  if (publicIndex === -1) return path.basename(fullPath);
  
  const relative = fullPath.substring(publicIndex + 'public'.length + 1);
  return relative.replace(/\\/g, '/'); // Convert to forward slashes
}

/**
 * Determine bucket from file path
 */
function getBucketFromPath(filePath) {
  if (filePath.includes('rules-images')) return BUCKETS['rules-images'];
  if (filePath.includes('gallery')) return BUCKETS.gallery;
  if (filePath.includes('boardle')) return BUCKETS['boardle-images'];
  if (filePath.includes('uploads')) return BUCKETS.uploads;
  return BUCKETS.uploads; // Default
}

/**
 * Get the storage path for a file (maintains subdirectory structure)
 */
function getStoragePath(localPath) {
  const publicIndex = localPath.indexOf('public' + path.sep);
  if (publicIndex === -1) return path.basename(localPath);
  
  const relative = localPath.substring(publicIndex + 'public'.length + 1);
  
  // Extract subdirectory structure (e.g., "rules-images/filename.jpg")
  const parts = relative.split(path.sep);
  if (parts.length > 1) {
    // Return with subdirectory (e.g., "rules-images/filename.jpg")
    return parts.join('/');
  }
  
  // If it's a direct file in the bucket root
  return parts[0];
}

async function migrateDirectory(dirName) {
  const dirPath = path.join(process.cwd(), 'public', dirName);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory ${dirName} does not exist, skipping...`);
    return [];
  }

  console.log(`\n📁 Scanning ${dirName}...`);
  const files = getAllFiles(dirPath);
  console.log(`   Found ${files.length} files`);

  if (files.length === 0) {
    return [];
  }

  const uploadResults = [];
  
  for (const filePath of files) {
    const bucket = getBucketFromPath(filePath);
    const storagePath = getStoragePath(filePath);
    const relativePath = getRelativePath(filePath);
    
    const publicUrl = await uploadFile(filePath, bucket, storagePath);
    
    if (publicUrl) {
      uploadResults.push({
        originalPath: relativePath,
        storagePath,
        bucket,
        newUrl: publicUrl
      });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return uploadResults;
}

async function main() {
  console.log('🚀 Starting Supabase Storage Migration\n');
  console.log('This will upload existing files to Supabase Storage...\n');

  const directories = ['gallery', 'uploads', 'boardle-images'];
  const allResults = [];

  for (const dir of directories) {
    const results = await migrateDirectory(dir);
    allResults.push(...results);
  }

  // Generate migration report
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully uploaded: ${allResults.length} files`);
  
  // Save results to file for reference
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📝 Full migration report saved to: ${reportPath}`);

  console.log('\n🎉 Migration complete!');
  console.log('\n📌 Next steps:');
  console.log('1. Check Supabase Dashboard → Storage to verify files');
  console.log('2. Update any hardcoded image paths in your code');
  console.log('3. Test image loading on your site');
  console.log('4. (Optional) Delete old files from public/ folder after verifying everything works');
}

main().catch(console.error);
