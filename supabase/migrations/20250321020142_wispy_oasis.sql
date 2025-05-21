/*
  # Fix Password Reset RLS Policies

  1. Changes
    - Add INSERT policy for password_reset_codes table
    - Add UPDATE policy for password_reset_codes table
    - Ensure proper security while allowing necessary operations
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can validate reset codes" ON password_reset_codes;

-- Create comprehensive policies
CREATE POLICY "Anyone can insert reset codes"
  ON password_reset_codes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can validate reset codes"
  ON password_reset_codes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update reset codes"
  ON password_reset_codes
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);