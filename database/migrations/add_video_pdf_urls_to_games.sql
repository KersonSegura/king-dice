-- Add videoUrl and pdfUrl columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS "videoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;

