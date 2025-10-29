# Supabase Storage Migration Guide

## Overview

We're migrating all user-uploaded content to Supabase Storage to solve the serverless function size limit and provide better scalability.

## What's Being Migrated

### ✅ To Supabase Storage:
- User gallery images
- User-uploaded content (profile pics, etc.)
- Community dice designs
- Rules images (when we migrate those)
- All future user uploads

### ✅ Staying in `public/` (Static Assets):
- UI icons and SVGs
- Site assets (logos, favicons)
- Catan tile images
- Level up icons
- Other static design elements

### ❌ Not Deployed to Vercel:
- Boardle images (keep local or migrate separately)
- Scraped rules HTML
- Scripts and build artifacts

## Setup Instructions

### 1. Add Environment Variables

Add these to your `.env` file and Vercel dashboard:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Get these from your Supabase dashboard:**
1. Go to Project Settings → API
2. Copy the Project URL → `SUPABASE_URL`
3. Copy the `anon` `public` key → `SUPABASE_ANON_KEY`
4. Copy the `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Create Storage Buckets

Run the setup script:

```bash
npm run setup:storage
```

This will create 5 buckets:
- `gallery` - Community gallery images
- `rules-images` - Game rules images
- `uploads` - General user uploads
- `boardle-images` - Boardle game images (if needed)
- `dice-designs` - Dice design images

### 3. Verify Buckets in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. You should see all 5 buckets listed
4. Check that they're set to **public** (except service-role access)

## Current Status

### ✅ Completed:
- Created `lib/supabase.ts` with storage utilities
- Updated `app/api/upload/route.ts` to use Supabase
- Updated `lib/gallery.ts` to use Supabase
- Created setup script `scripts/setup-supabase-storage.js`

### 🚧 In Progress:
- Need to test upload functionality
- Need to migrate existing images (if any)

### 📋 TODO:
- Update other APIs that upload files
- Create migration script for existing files
- Test in production

## Storage Usage

With your Supabase Pro account (500 GB):
- **Current estimated usage**: ~182 MB (0.036% of total)
- **Room for growth**: ~500,000 average-sized images
- **Cost**: Included in your Pro plan

## Benefits

### ✅ Fixed Issues:
1. **Serverless function size limit** - No more 50MB limit issues
2. **Build times** - Faster deployments
3. **Scalability** - Can grow to 500 GB without issues

### ✅ New Features:
1. **Global CDN** - Images served from edge locations worldwide
2. **Automatic backups** - Supabase handles backups
3. **File management** - Easier to manage and delete orphaned files
4. **Better performance** - CDN caching for faster loads

## Testing

### Test Upload Functionality:

1. Go to gallery page
2. Upload an image
3. Check Supabase Storage dashboard to verify file appears
4. Verify image displays correctly on the site

### Test Storage Quota:

Check your usage in Supabase Dashboard → Storage → Usage

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure your `.env` file has all required variables
- Restart your dev server after adding variables

### Error: "Bucket does not exist"
- Run `npm run setup:storage` to create buckets

### Error: "Permission denied"
- Check that your `SUPABASE_SERVICE_ROLE_KEY` is correct
- Service role key has admin access to storage

### Images not displaying
- Check that bucket is set to "public" in Supabase Dashboard
- Verify the URL is using HTTPS

## Migrating Existing Files

### Step 1: Setup Buckets
```bash
npm run setup:storage
```

### Step 2: Migrate Existing Files
```bash
npm run migrate:storage
```

This script will:
- Scan `public/gallery/` for existing gallery images
- Scan `public/uploads/` for existing uploaded files
- Scan `public/boardle-images/` for Boardle game images (if any)
- Upload each file to the appropriate Supabase Storage bucket
- Generate a `migration-report.json` with old paths → new URLs mapping

### Step 3: Verify Migration
1. Check Supabase Dashboard → Storage
2. Verify all files appear in the correct buckets
3. Check the `migration-report.json` file for the URL mappings

### Step 4: Update Database References (If Needed)

If you have existing gallery entries or other records referencing the old paths, you'll need to update them:

```sql
-- Example: Update gallery image URLs
UPDATE gallery_images 
SET "imageUrl" = 'https://new-supabase-url.com/...'
WHERE "imageUrl" LIKE '/gallery/%';
```

## Next Steps

1. ✅ Set up environment variables
2. ✅ Run `npm run setup:storage`
3. ✅ Run `npm run migrate:storage` (if you have existing files)
4. ✅ Test upload functionality
5. ⏳ Deploy to production
6. ⏳ (Optional) Clean up old files from `public/` after verifying
