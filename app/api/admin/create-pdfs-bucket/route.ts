import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json(
        { error: 'Failed to list buckets', details: listError.message },
        { status: 500 }
      );
    }

    const bucketExists = existingBuckets?.find(b => b.name === 'pdfs');

    if (bucketExists) {
      return NextResponse.json({
        success: true,
        message: 'Bucket "pdfs" already exists',
        bucket: bucketExists
      });
    }

    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket('pdfs', {
      public: true,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 52428800, // 50 MB
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return NextResponse.json(
        { error: 'Failed to create bucket', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket "pdfs" created successfully',
      bucket: data
    });
  } catch (error) {
    console.error('Exception creating bucket:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

