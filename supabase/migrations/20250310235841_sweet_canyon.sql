/*
  # Add general comments to service records

  1. Changes
    - Add general_comments column to service_records table
    
  2. Description
    - Adds an optional text field for general comments on service records
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' 
    AND column_name = 'general_comments'
  ) THEN
    ALTER TABLE service_records ADD COLUMN general_comments text;
  END IF;
END $$;