#!/usr/bin/env node
/**
 * Flatten Supabase Storage gallery keys:
 * - From: gallery/<filename>
 * - To:   <filename>
 *
 * Requires env:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY (admin)
 */

/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const BUCKET = 'gallery';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  console.log('Listing objects in bucket:', BUCKET);
  const { data: list, error: listError } = await supabase
    .storage
    .from(BUCKET)
    .list('', { limit: 1000, search: '' });

  if (listError) {
    console.error('List error:', listError);
    process.exit(1);
  }

  // Also list inside the nested 'gallery' folder if present
  const { data: nested, error: nestedErr } = await supabase
    .storage
    .from(BUCKET)
    .list('gallery', { limit: 1000, search: '' });

  if (nestedErr) {
    console.error('Nested list error (can be ignored if folder missing):', nestedErr);
  }

  const toProcess = (nested || []).filter(obj => obj && obj.name);
  console.log(`Found ${toProcess.length} objects under gallery/`);

  let moved = 0;
  let skipped = 0;
  for (const obj of toProcess) {
    const fromPath = `gallery/${obj.name}`;
    const toPath = obj.name; // flatten to root

    // Download source
    const { data: fileData, error: downloadErr } = await supabase
      .storage
      .from(BUCKET)
      .download(fromPath);
    if (downloadErr) {
      console.error('Download failed:', fromPath, downloadErr);
      skipped++;
      continue;
    }

    // Upload to new location (contentType best-effort)
    const contentType = obj.metadata?.mimetype || undefined;
    const { error: uploadErr } = await supabase
      .storage
      .from(BUCKET)
      .upload(toPath, fileData, { upsert: false, contentType });
    if (uploadErr) {
      if (uploadErr.message && uploadErr.message.includes('already exists')) {
        console.warn('Skip, already exists at target:', toPath);
        skipped++;
      } else {
        console.error('Upload failed:', toPath, uploadErr);
        skipped++;
        continue;
      }
    }

    // Remove old
    const { error: removeErr } = await supabase
      .storage
      .from(BUCKET)
      .remove([fromPath]);
    if (removeErr) {
      console.error('Remove old failed:', fromPath, removeErr);
      // don't count as moved to keep accurate state
      skipped++;
      continue;
    }

    moved++;
    console.log(`Moved: ${fromPath} -> ${toPath}`);
  }

  console.log('Done. Moved:', moved, 'Skipped:', skipped);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});


