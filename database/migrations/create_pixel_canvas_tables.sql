-- Create pixel_canvas table for canvas metadata
CREATE TABLE IF NOT EXISTS pixel_canvas (
  id TEXT PRIMARY KEY DEFAULT 'main-canvas',
  width INTEGER NOT NULL DEFAULT 200,
  height INTEGER NOT NULL DEFAULT 200,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_pixels INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pixel_placements table for individual pixels
CREATE TABLE IF NOT EXISTS pixel_placements (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL DEFAULT 'main-canvas',
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(canvas_id, x, y)
);

-- Create pixel_cooldowns table for user cooldowns
CREATE TABLE IF NOT EXISTS pixel_cooldowns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  last_pixel_time TIMESTAMPTZ NOT NULL,
  cooldown_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0.167,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pixel_placements_canvas ON pixel_placements(canvas_id);
CREATE INDEX IF NOT EXISTS idx_pixel_placements_coords ON pixel_placements(canvas_id, x, y);
CREATE INDEX IF NOT EXISTS idx_pixel_placements_user ON pixel_placements(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_cooldowns_user ON pixel_cooldowns(user_id);

-- Insert initial canvas if it doesn't exist
INSERT INTO pixel_canvas (id, width, height, last_updated, total_pixels, unique_users)
VALUES ('main-canvas', 200, 200, NOW(), 0, 0)
ON CONFLICT (id) DO NOTHING;

