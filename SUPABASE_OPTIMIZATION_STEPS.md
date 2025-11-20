# Supabase Optimization Steps

Based on the Supabase AI assistant's recommendations, follow these steps to optimize query performance.

## Step 1: Run Diagnostic Queries

1. Open **Supabase SQL Editor**
2. Open `supabase/diagnostics/check_query_performance.sql`
3. Run each query section one by one:

   **Query 1 (EXPLAIN ANALYZE)**: 
   - Look for `Bitmap Index Scan` or `Index Scan` on `idx_games_best_name_norm`
   - **Should NOT see**: `Seq Scan` (sequential scan)
   - Execution time should be **under 100ms** for 50 values
   
   **Query 2-7**: Check indexes, column types, locks, and statistics

## Step 2: Run ANALYZE (Important!)

If you see `Seq Scan` or slow performance:

```sql
ANALYZE public.games;
```

This refreshes table statistics so the query planner makes better decisions.

## Step 3: Deploy Optimized RPC Function

1. Open **Supabase SQL Editor**
2. Copy and paste the contents of `supabase/migrations/optimize_get_games_rpc.sql`
3. Run it

This creates an optimized version that **guarantees index usage** using a two-stage join:
- First stage: Get IDs using the index (fast)
- Second stage: Join by primary key to get full rows (trivial)

## Step 4: Test the Optimized Function

Run this test query:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.get_games_by_best_names_ordered(ARRAY[
  'covenant',
  'recall',
  'deckers',
  'ark nova',
  'terraforming mars'
]);
```

You should see:
- ✅ `Index Scan` or `Bitmap Index Scan` on `idx_games_best_name_norm`
- ✅ Execution time < 50ms for 5 games
- ✅ Execution time < 200ms for 50 games

## Step 5: Redeploy to Vercel

The code changes are already pushed. Vercel should auto-deploy, but you can:
1. Check Vercel dashboard for deployment status
2. Wait for deployment to complete
3. Test the hot games and top-ranked pages

## What Changed?

### Before (Original RPC):
```sql
SELECT g.*
FROM input i
JOIN public.games g ON g.best_name_norm = i.n
ORDER BY i.ord
```

### After (Optimized RPC):
```sql
WITH ids AS (
  SELECT g.id, i.ord
  FROM input i
  JOIN public.games g ON g.best_name_norm = i.n
)
SELECT g.*
FROM ids
JOIN public.games g USING (id)
ORDER BY ids.ord
```

**Why this works better:**
- The first join is small (just IDs) and **guarantees index usage**
- The second join by primary key is trivial (PK lookups are instant)
- The planner can't accidentally choose a sequential scan

## Optional: Use Lightweight Version

If you still see performance issues, you can use the lightweight version that returns fewer columns:

```typescript
// In your API route, change:
.rpc('get_games_by_best_names_ordered', { _names: normalizedNameValues })

// To:
.rpc('get_games_by_best_names_ordered_light', { _names: normalizedNameValues })
```

This reduces row width and can be faster for large tables.

## Troubleshooting

### Still seeing Seq Scan?
1. Run `ANALYZE public.games;` again
2. Check that the index exists: `\di+ idx_games_best_name_norm`
3. Verify `best_name_norm` is STORED (not virtual)

### Still timing out?
1. Check for blocking queries (Query 5 in diagnostics)
2. Check connection pool limits in Supabase dashboard
3. Consider reducing concurrency (fewer parallel requests)

### Partial results?
1. Check normalization matches between client and database
2. Log missing games and inspect their `best_name_norm` values
3. Verify no Unicode spaces (NBSP) in names

## Expected Results

After optimization:
- ✅ All 50 hot games load in < 2 seconds
- ✅ All 25 top-ranked games load in < 1 second
- ✅ No timeouts
- ✅ Consistent performance

## Share Results

After running the diagnostics, share:
1. EXPLAIN ANALYZE output (especially the execution plan)
2. Execution time for 50-name query
3. Whether you see Index Scan or Seq Scan

This will help identify any remaining issues!

