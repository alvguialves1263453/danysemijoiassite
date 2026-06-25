-- Add sort_order column for custom image ordering
ALTER TABLE images ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_images_sort_order ON images (sort_order);
