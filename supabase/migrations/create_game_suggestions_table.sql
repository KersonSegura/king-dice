-- Create game_suggestions table to track user game suggestions
CREATE TABLE IF NOT EXISTS public.game_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Nullable to allow anonymous suggestions
  username TEXT NOT NULL,
  game_name TEXT NOT NULL,
  is_expansion BOOLEAN DEFAULT false,
  is_different_edition BOOLEAN DEFAULT false,
  additional_info TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'added'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to users table (only if user_id is provided)
  CONSTRAINT fk_game_suggestions_user 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE
);

-- Create index on user_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_game_suggestions_user_id 
  ON public.game_suggestions(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_game_suggestions_status 
  ON public.game_suggestions(status);

-- Create index on game_name for checking duplicates/similar suggestions
CREATE INDEX IF NOT EXISTS idx_game_suggestions_game_name 
  ON public.game_suggestions(LOWER(game_name));

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_game_suggestions_created_at 
  ON public.game_suggestions(created_at DESC);

