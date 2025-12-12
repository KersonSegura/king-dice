-- Fix the sequence for game_categories table
-- This resets the sequence to use the next available ID

SELECT setval(
  pg_get_serial_sequence('game_categories', 'id'), 
  COALESCE((SELECT MAX(id) FROM game_categories), 1),
  true
);

