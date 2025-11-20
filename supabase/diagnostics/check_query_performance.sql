-- Diagnostic queries to check RPC performance
-- Run these in Supabase SQL Editor to identify bottlenecks

-- 1. EXPLAIN ANALYZE: Check if index is being used
-- Replace the array with your actual 50 game names (normalized)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH input AS (
  SELECT n, ord
  FROM unnest(ARRAY[
    'covenant',
    'recall',
    'deckers',
    'tax the rich',
    'children of the colossi',
    'kuldhara',
    'orloj: the prague astronomical clock',
    'the hobbit: there and back again',
    'seti: space agencies',
    'feya''s swamp',
    'the lord of the rings: duel for middle-earth – allies',
    'seti: search for extraterrestrial intelligence',
    'speakeasy',
    'the old king''s crown',
    'the lord of the rings: fate of the fellowship',
    'sanctuary',
    'bohemians',
    'tag team',
    'vantage',
    'gelati',
    'the druids of edora',
    'take time',
    'ayar: children of the sun',
    'ark nova',
    'galileo''s truth',
    'the lord of the rings: duel for middle-earth',
    '1ers contacts',
    'wispwood',
    'emberheart',
    'lost ruins of arnak: twisted paths',
    'ants',
    'lost ruins of arnak',
    'brass: birmingham',
    'coming of age',
    'galactic cruise',
    'forestry',
    'federation: piracy',
    'nature',
    'echoes of time',
    'arcs',
    'the elder scrolls: betrayal of the second era',
    'bomb busters',
    'terraforming mars',
    'kingdom crossing',
    'castle combo',
    'luthier',
    'slay the spire: the board game',
    'origin story',
    'harmonies',
    'tainted grail: the fall of avalon'
  ]) WITH ORDINALITY AS t(n, ord)
),
ids AS (
  SELECT g.id, i.ord
  FROM input i
  JOIN public.games g
    ON g.best_name_norm = i.n
)
SELECT g.*
FROM ids
JOIN public.games g USING (id)
ORDER BY ids.ord;

-- 2. Check if index exists and is being used
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'games' 
  AND indexname LIKE '%best_name_norm%';

-- 3. Verify the generated column is STORED (not virtual)
SELECT 
  column_name,
  data_type,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'games'
  AND column_name = 'best_name_norm';

-- 4. Run ANALYZE to refresh statistics (important for query planner)
ANALYZE public.games;

-- 5. Check for blocking queries/locks
SELECT 
  bl.pid     AS blocked_pid,
  a.usename  AS blocked_user,
  ka.query   AS blocking_query,
  now() - ka.query_start AS blocking_duration
FROM pg_catalog.pg_locks         bl
JOIN pg_catalog.pg_stat_activity a  ON a.pid = bl.pid
JOIN pg_catalog.pg_locks         kl ON kl.locktype = bl.locktype
                                   AND kl.DATABASE IS NOT DISTINCT FROM bl.DATABASE
                                   AND kl.relation IS NOT DISTINCT FROM bl.relation
                                   AND kl.page IS NOT DISTINCT FROM bl.page
                                   AND kl.tuple IS NOT DISTINCT FROM bl.tuple
                                   AND kl.virtualxid IS NOT DISTINCT FROM bl.virtualxid
                                   AND kl.transactionid IS NOT DISTINCT FROM bl.transactionid
                                   AND kl.classid IS NOT DISTINCT FROM bl.classid
                                   AND kl.objid IS NOT DISTINCT FROM bl.objid
                                   AND kl.objsubid IS NOT DISTINCT FROM bl.objsubid
                                   AND kl.pid != bl.pid
JOIN pg_catalog.pg_stat_activity ka ON ka.pid = kl.pid
WHERE NOT bl.granted;

-- 6. Check table statistics
SELECT 
  schemaname,
  tablename,
  n_live_tup AS row_count,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'games';

-- 7. Test the RPC function directly with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM public.get_games_by_best_names_ordered(ARRAY[
  'covenant',
  'recall',
  'deckers',
  'tax the rich',
  'ark nova',
  'terraforming mars',
  'harmonies',
  'lost ruins of arnak'
]);

