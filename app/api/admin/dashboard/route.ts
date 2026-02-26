import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKETS } from '@/lib/supabase';
import { requireAdminFromRequest } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

type StorageSize = { bucket: string; bytes: number };
type AnalyticsSummary = {
  active_24h?: number;
  active_7d?: number;
  top_links?: Array<{ path: string; visits: number }>;
  top_locations?: Array<{ country_code: string; city: string; visits: number }>;
  source_breakdown?: Array<{ source: string; visits: number }>;
};

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

    const since30d = startDate(30);

    const [
      usersTotalRes,
      gamesTotalRes,
      postsTotalRes,
      galleryTotalRes,
      messagesTotalRes,
      newUsers30dRes,
      analyticsSummaryRes,
      dbSizeRes,
      pendingReportsRes,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('games').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('gallery_images').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('createdAt', since30d),
      supabaseAdmin.rpc('get_admin_analytics_summary', {
        p_since: since30d,
        p_top_n: 12,
      }),
      supabaseAdmin.rpc('get_database_size_bytes'),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const bucketSizes: StorageSize[] = [];
    for (const bucket of Object.values(STORAGE_BUCKETS)) {
      const size = await getBucketSize(bucket);
      bucketSizes.push({ bucket, bytes: size });
    }

    const pendingReportsCount = pendingReportsRes.count ?? 0;
    const totalStorageBytes = bucketSizes.reduce((sum, b) => sum + b.bytes, 0);
    const dbSizeBytes = Number(dbSizeRes.data || 0) || 0;
    const dbQuotaBytes = Number(process.env.SUPABASE_DB_QUOTA_BYTES || 0) || 0;
    const dbRemainingBytes = dbQuotaBytes > 0 ? Math.max(dbQuotaBytes - dbSizeBytes, 0) : null;
    const analyticsSummary = (analyticsSummaryRes.data || {}) as AnalyticsSummary;
    const topLinks = Array.isArray(analyticsSummary.top_links) ? analyticsSummary.top_links : [];
    const topLocations = Array.isArray(analyticsSummary.top_locations) ? analyticsSummary.top_locations : [];
    const sourceBreakdown = Array.isArray(analyticsSummary.source_breakdown)
      ? analyticsSummary.source_breakdown
      : [];

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers: usersTotalRes.count || 0,
        activeUsers24h: Number(analyticsSummary.active_24h || 0),
        activeUsers7d: Number(analyticsSummary.active_7d || 0),
        newUsers30d: newUsers30dRes.count || 0,
        totalGames: gamesTotalRes.count || 0,
        totalPosts: postsTotalRes.count || 0,
        totalGalleryImages: galleryTotalRes.count || 0,
        totalMessages: messagesTotalRes.count || 0,
        pendingReports: pendingReportsCount,
      },
      storage: {
        totalUsedBytes: totalStorageBytes,
        totalUsedPretty: formatBytes(totalStorageBytes),
        databaseUsedBytes: dbSizeBytes,
        databaseUsedPretty: formatBytes(dbSizeBytes),
        databaseQuotaBytes: dbQuotaBytes,
        databaseQuotaPretty: dbQuotaBytes > 0 ? formatBytes(dbQuotaBytes) : null,
        databaseRemainingBytes: dbRemainingBytes,
        databaseRemainingPretty: dbRemainingBytes != null ? formatBytes(dbRemainingBytes) : null,
        buckets: bucketSizes.map((b) => ({
          bucket: b.bucket,
          usedBytes: b.bytes,
          usedPretty: formatBytes(b.bytes),
        })),
      },
      traffic: {
        summary: 'Tracked from live page views over the last 30 days.',
        sourceBreakdown,
        topVisitedLinks: topLinks,
      },
      locations: {
        available: topLocations.length > 0,
        message:
          topLocations.length > 0
            ? 'Approximate location from edge headers (country/city when available).'
            : 'No location analytics collected yet.',
        topLocations,
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

