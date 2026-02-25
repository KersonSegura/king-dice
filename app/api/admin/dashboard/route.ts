import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKETS } from '@/lib/supabase';
import { requireAdminFromRequest } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

type StorageSize = { bucket: string; bytes: number };

function startDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

async function getBucketSize(bucket: string): Promise<number> {
  let offset = 0;
  const limit = 100;
  let total = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error || !data) {
      return total;
    }

    for (const file of data as Array<{ id?: string; name?: string; metadata?: { size?: number } }>) {
      total += file.metadata?.size || 0;
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return total;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdminFromRequest(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const since24h = startDate(1);
    const since7d = startDate(7);
    const since30d = startDate(30);

    const [
      usersTotalRes,
      usersActive7dRes,
      usersActive24hRes,
      gamesTotalRes,
      postsTotalRes,
      galleryTotalRes,
      messagesTotalRes,
      newUsers30dRes,
      topGalleryRes,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('updatedAt', since7d),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('updatedAt', since24h),
      supabaseAdmin.from('games').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('gallery_images').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('createdAt', since30d),
      supabaseAdmin
        .from('gallery_images')
        .select('id, title, views, downloads')
        .order('views', { ascending: false })
        .limit(10),
    ]);

    const bucketSizes: StorageSize[] = [];
    for (const bucket of Object.values(STORAGE_BUCKETS)) {
      const size = await getBucketSize(bucket);
      bucketSizes.push({ bucket, bytes: size });
    }

    const totalStorageBytes = bucketSizes.reduce((sum, b) => sum + b.bytes, 0);

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers: usersTotalRes.count || 0,
        activeUsers24h: usersActive24hRes.count || 0,
        activeUsers7d: usersActive7dRes.count || 0,
        newUsers30d: newUsers30dRes.count || 0,
        totalGames: gamesTotalRes.count || 0,
        totalPosts: postsTotalRes.count || 0,
        totalGalleryImages: galleryTotalRes.count || 0,
        totalMessages: messagesTotalRes.count || 0,
      },
      storage: {
        totalUsedBytes: totalStorageBytes,
        totalUsedPretty: formatBytes(totalStorageBytes),
        buckets: bucketSizes.map((b) => ({
          bucket: b.bucket,
          usedBytes: b.bytes,
          usedPretty: formatBytes(b.bytes),
        })),
        databaseRemaining: 'Not available via current database API',
      },
      traffic: {
        summary:
          'Traffic by URL/location is not currently tracked in a dedicated analytics table. This dashboard shows available database activity metrics.',
        topVisitedLinks:
          topGalleryRes.data?.map((item) => ({
            path: `/community-gallery/${item.id}`,
            title: item.title,
            views: item.views || 0,
            downloads: item.downloads || 0,
          })) || [],
      },
      locations: {
        available: false,
        message: 'Location analytics are not available yet (no geo-tracking source configured).',
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

