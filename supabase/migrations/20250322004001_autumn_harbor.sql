/*
  # Add Images Support to Service Records

  1. Changes
    - Add images column to service_records table
    - Update existing records with empty array default
    
  2. Description
    - Adds support for storing up to 6 image URLs per service record
    - Images array will store the URLs of uploaded images
*/

-- Add images column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' 
    AND column_name = 'images'
  ) THEN
    ALTER TABLE service_records ADD COLUMN images text[] DEFAULT '{}';
  END IF;
END $$;