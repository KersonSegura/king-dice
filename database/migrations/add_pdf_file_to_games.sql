-- Add pdfFile column to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS "pdfFile" TEXT;
