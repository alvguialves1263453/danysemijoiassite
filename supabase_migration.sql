-- Migration: Create images table for Dany Semijoias
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ckbdrzaynuxlzrndnptz/sql/new)

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('corrente', 'colar', 'pulseira', 'anel', 'brinco')),
  size BIGINT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imagekit_url TEXT NOT NULL,
  imagekit_file_id TEXT NOT NULL
);

-- Index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_images_category ON images (category);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images (uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Public can read all images
CREATE POLICY "Public can read images"
  ON images FOR SELECT
  USING (true);

-- Only server with service_role can insert/update/delete
CREATE POLICY "Service role can insert"
  ON images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update"
  ON images FOR UPDATE
  USING (true);

CREATE POLICY "Service role can delete"
  ON images FOR DELETE
  USING (true);
