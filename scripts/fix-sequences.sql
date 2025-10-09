-- Fix auto-increment sequences for PostgreSQL
-- This script resets all sequences to their correct values based on existing data

-- Fix game_descriptions sequence
SELECT setval(
    pg_get_serial_sequence('game_descriptions', 'id'),
    COALESCE((SELECT MAX(id) FROM game_descriptions), 0) + 1,
    false
);

-- Fix game_rules sequence
SELECT setval(
    pg_get_serial_sequence('game_rules', 'id'),
    COALESCE((SELECT MAX(id) FROM game_rules), 0) + 1,
    false
);

-- Fix games sequence
SELECT setval(
    pg_get_serial_sequence('games', 'id'),
    COALESCE((SELECT MAX(id) FROM games), 0) + 1,
    false
);

-- Fix categories sequence
SELECT setval(
    pg_get_serial_sequence('categories', 'id'),
    COALESCE((SELECT MAX(id) FROM categories), 0) + 1,
    false
);

-- Fix mechanics sequence
SELECT setval(
    pg_get_serial_sequence('mechanics', 'id'),
    COALESCE((SELECT MAX(id) FROM mechanics), 0) + 1,
    false
);

-- Fix expansions sequence
SELECT setval(
    pg_get_serial_sequence('expansions', 'id'),
    COALESCE((SELECT MAX(id) FROM expansions), 0) + 1,
    false
);

-- Fix game_categories sequence
SELECT setval(
    pg_get_serial_sequence('game_categories', 'id'),
    COALESCE((SELECT MAX(id) FROM game_categories), 0) + 1,
    false
);

-- Fix game_mechanics sequence
SELECT setval(
    pg_get_serial_sequence('game_mechanics', 'id'),
    COALESCE((SELECT MAX(id) FROM game_mechanics), 0) + 1,
    false
);

-- Fix user_games sequence
SELECT setval(
    pg_get_serial_sequence('user_games', 'id'),
    COALESCE((SELECT MAX(id) FROM user_games), 0) + 1,
    false
);

-- Fix user_votes sequence
SELECT setval(
    pg_get_serial_sequence('user_votes', 'id'),
    COALESCE((SELECT MAX(id) FROM user_votes), 0) + 1,
    false
);

-- Display results
SELECT 
    'game_descriptions' as table_name,
    currval(pg_get_serial_sequence('game_descriptions', 'id')) as current_sequence_value,
    (SELECT MAX(id) FROM game_descriptions) as max_id_in_table
UNION ALL
SELECT 
    'game_rules',
    currval(pg_get_serial_sequence('game_rules', 'id')),
    (SELECT MAX(id) FROM game_rules)
UNION ALL
SELECT 
    'games',
    currval(pg_get_serial_sequence('games', 'id')),
    (SELECT MAX(id) FROM games);

