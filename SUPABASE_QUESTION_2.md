# Question for Supabase AI Assistant - Large List Query Performance

## Problem Summary
I'm querying games from a PostgreSQL database using PostgREST `.in()` queries on a normalized column (`best_name_norm`). Small queries (6 games) work perfectly and are fast, but larger queries (25-50 games) are timing out or failing.

## Current Implementation

### Database Setup
- Table: `games`
- Normalized column: `best_name_norm` (generated column, lowercased, whitespace normalized)
- Index: `idx_games_best_name_norm` on `best_name_norm`
- Column definition:
  ```sql
  best_name_norm text GENERATED ALWAYS AS (
    lower(regexp_replace(coalesce("nameEn", "nameEs", "name"), '\s+', ' ', 'g'))
  ) STORED;
  ```

### Query Pattern
```typescript
// This works perfectly for 6 games
const { data } = await supabaseAdmin
  .from('games')
  .select('*')
  .in('best_name_norm', normalizedNames); // normalizedNames.length = 6

// This times out for 25-50 games, even when batched
const { data } = await supabaseAdmin
  .from('games')
  .select('*')
  .in('best_name_norm', normalizedNames); // normalizedNames.length = 25-50
```

### Current Batching Strategy
I'm trying to query in batches of 20 games at a time:
```typescript
const BATCH_SIZE = 20;
for (let i = 0; i < normalizedNames.length; i += BATCH_SIZE) {
  const batch = normalizedNames.slice(i, i + BATCH_SIZE);
  const { data } = await supabaseAdmin
    .from('games')
    .select('*')
    .in('best_name_norm', batch);
}
```

## What Works
- ✅ Querying 6 games: Fast (< 1 second), reliable
- ✅ Normalized column exists and is indexed
- ✅ Small `.in()` queries work perfectly

## What Doesn't Work
- ❌ Querying 25-50 games: Times out (10+ seconds) or fails
- ❌ Even when batched into groups of 20, queries timeout
- ❌ Error: "Database query failed after 3 attempts: Operation timeout after 10000ms"
- ❌ Error: "canceling statement due to statement timeout"

## Questions

1. **Is there a limit on `.in()` array size in PostgREST?** Should I be using a different approach for larger lists?

2. **Could the issue be with the generated column or index?** The `best_name_norm` column uses `coalesce()` and `regexp_replace()` - could this be slow for large queries?

3. **Should I use a different query pattern for larger lists?** For example:
   - RPC function with array parameter?
   - Temporary table join?
   - Multiple smaller queries in parallel?
   - Something else?

4. **Are there PostgREST query size limits** I should be aware of? (URL length, query complexity, etc.)

5. **Could connection pooling be the issue?** I'm using Supabase's default PostgREST API. Should I configure connection pooling differently?

6. **Is the index being used correctly?** The query planner might not be using the index for `.in()` queries with many values. Should I verify the execution plan?

7. **What's the recommended approach for querying 25-50 records by exact name matches?** Should I:
   - Use smaller batch sizes (5-10)?
   - Use a different query pattern entirely?
   - Create a different index structure?
   - Use a stored procedure/RPC?

## Environment
- Supabase project (PostgreSQL 15+)
- Next.js 14 API routes (serverless on Vercel)
- Using `@supabase/supabase-js` client
- Service role key (bypasses RLS)
- Generated column with index

## Example That Works (6 games)
```typescript
const names = ['covenant', 'recall', 'deckers', 'tax the rich', 'children of the colossi', 'kuldhara'];
const { data } = await supabaseAdmin
  .from('games')
  .select('*')
  .in('best_name_norm', names);
// ✅ Returns in < 1 second
```

## Example That Fails (50 games)
```typescript
const names = [/* 50 normalized game names */];
const { data } = await supabaseAdmin
  .from('games')
  .select('*')
  .in('best_name_norm', names);
// ❌ Times out after 10 seconds
```

What's the best practice for querying larger lists (25-50 records) by exact name matches in PostgREST/Supabase?


