-- Create canvas_snapshots table for weekly snapshots
CREATE TABLE IF NOT EXISTS canvas_snapshots (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL DEFAULT 'main-canvas',
  week_id TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL,
  canvas_data JSONB NOT NULL,
  image_data TEXT,
  total_pixels INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(canvas_id, week_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_canvas ON canvas_snapshots(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_week ON canvas_snapshots(canvas_id, week_id);
CREATE INDEX IF NOT EXISTS idx_canvas_snapshots_date ON canvas_snapshots(snapshot_date DESC);

