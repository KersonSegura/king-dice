-- Add gallery comments support to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS gallery_image_id TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- Add foreign key constraint for gallery images
ALTER TABLE comments ADD CONSTRAINT fk_comments_gallery_image 
  FOREIGN KEY (gallery_image_id) REFERENCES gallery_images(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_comments_gallery_image_id ON comments(gallery_image_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

