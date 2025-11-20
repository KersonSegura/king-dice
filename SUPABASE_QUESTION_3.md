# Query Performance Issue: Fetching Games by Name List

## Problem Summary
We're experiencing slow and unreliable query performance when fetching 25-50 games by their names. The queries are timing out or returning incomplete results, even though:
- The main page successfully loads 6 games quickly
- The games exist in the database
- We've implemented normalized columns and RPC functions as recommended

## Current Implementation

### Database Schema
We have a `games` table with:
- `id` (primary key)
- `nameEn` (English name, camelCase)
- `nameEs` (Spanish name, camelCase)  
- `name` (fallback name, camelCase)
- `best_name_norm` (GENERATED ALWAYS AS column, normalized: lowercase, trimmed, collapsed whitespace)
- Index on `best_name_norm`: `idx_games_best_name_norm`

### Normalization Function
```typescript
// Client-side normalization (matches database normalization)
function normalizeGameName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}
```

### RPC Function (Currently Deployed)
```sql
CREATE OR REPLACE FUNCTION public.get_games_by_best_names_ordered(_names text[])
RETURNS SETOF public.games
LANGUAGE sql STABLE AS $$
  WITH input AS (
    SELECT n, ord
    FROM unnest(_names) WITH ORDINALITY AS t(n, ord)
  )
  SELECT g.*
  FROM input i
  JOIN public.games g
    ON g.best_name_norm = i.n
  ORDER BY i.ord
$$;
```

### API Route Implementation

**Hot Games API** (`/api/games/hotness`):
- Hardcoded list of 50 game names (e.g., "Covenant", "Recall", "Ark Nova", etc.)
- Accepts `limit` parameter (default: 50)
- Process:
  1. Normalize all game names using `normalizeGameName()`
  2. Call RPC: `supabaseAdmin.rpc('get_games_by_best_names_ordered', { _names: normalizedNameArray })`
  3. Match returned games back to original positions using `best_name_norm`
  4. Return games in original order

**Most Played API** (`/api/games/most-played`):
- Hardcoded list of 25 game objects with `{ name, year }`
- Similar process but also considers year matching

### Query Execution Details
- Using `executeSupabaseQuery` helper with:
  - `maxRetries: 2`
  - `baseDelay: 200ms`
  - `timeout: 10000ms` (10 seconds)
- Retry logic handles network errors, timeouts, and 5xx errors
- Uses exponential backoff with jitter

### Frontend Behavior
- **Main page**: Fetches 6 games per section → **WORKS FAST** ✅
- **Hot games page**: Fetches 50 games → **SLOW/INCOMPLETE** ❌
- **Top-ranked page**: Fetches 25 games → **SLOW/INCOMPLETE** ❌

Frontend makes two requests:
1. First: `limit=10` (timeout: 8s) - shows first 10 games quickly
2. Second: `limit=50` (timeout: 20s) - fills remaining slots in background

## Symptoms
1. **Partial results**: Only 10-20 games load instead of 25-50
2. **Timeouts**: Queries exceed 10-second timeout
3. **Inconsistent behavior**: Sometimes works, sometimes fails
4. **Main page works**: 6 games load instantly, suggesting small queries are fine

## What We've Tried
1. ✅ Added normalized columns (`best_name_norm`) with indexes
2. ✅ Created RPC function using `= ANY()` pattern
3. ✅ Implemented retry logic with exponential backoff
4. ✅ Progressive loading (show 10 first, then load rest)
5. ❌ Previously tried `.in()` queries → too slow
6. ❌ Previously tried large `.or()` queries → PostgREST parsing issues
7. ❌ Previously tried batched queries → still slow

## Questions for Supabase AI
1. **Is the RPC function optimal?** Should we use a different SQL pattern for 25-50 name lookups?
2. **Are there query plan issues?** Should we add additional indexes or use a different join strategy?
3. **Is PostgREST the bottleneck?** Should we use direct PostgreSQL connection for these queries?
4. **Is the array size (25-50) causing issues?** Should we batch the RPC calls or use a different approach?
5. **Are there connection pool issues?** Could we be hitting connection limits?
6. **Should we cache results?** Would materialized views or caching help?

## Example Query
When calling the RPC with 50 normalized names:
```typescript
const normalizedNames = [
  "covenant",
  "recall", 
  "deckers",
  "tax the rich",
  // ... 46 more names
];

const { data, error } = await supabaseAdmin.rpc(
  'get_games_by_best_names_ordered',
  { _names: normalizedNames }
);
```

## Expected vs Actual
- **Expected**: All 50 games returned in < 2 seconds
- **Actual**: 10-20 games returned, or timeout after 10 seconds

## Environment
- Supabase (PostgreSQL 15+)
- Next.js API routes (serverless functions on Vercel)
- PostgREST client (`@supabase/supabase-js`)
- ~10,000+ games in database
- Normalized column is indexed

Please help us identify the bottleneck and suggest optimizations!

