-- Create catan_nominations table
CREATE TABLE IF NOT EXISTS catan_nominations (
  id SERIAL PRIMARY KEY,
  map_data JSONB NOT NULL,
  image_data TEXT NOT NULL,
  custom_rules JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  votes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id VARCHAR(255), -- Optional: for future user authentication
  title VARCHAR(255), -- Optional: for future map titles
  description TEXT -- Optional: for future map descriptions
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catan_nominations_status ON catan_nominations(status);
CREATE INDEX IF NOT EXISTS idx_catan_nominations_votes ON catan_nominations(votes DESC);
CREATE INDEX IF NOT EXISTS idx_catan_nominations_created_at ON catan_nominations(created_at DESC);

-- Create a view for approved nominations (top maps)
CREATE OR REPLACE VIEW top_catan_maps AS
SELECT 
  id,
  map_data,
  image_data,
  custom_rules,
  created_at,
  votes,
  title,
  description
FROM catan_nominations 
WHERE status = 'approved'
ORDER BY votes DESC, created_at DESC;
