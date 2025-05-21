/*
  # Add last_seen column to users table

  1. Changes
    - Add `last_seen` column to `users` table to track user activity

  2. Security
    - No changes to RLS policies
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE users ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;
END $$;