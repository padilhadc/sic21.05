/*
  # Add Password Reset System

  1. New Tables
    - password_reset_codes
      - id (uuid, primary key)
      - email (text)
      - code (text)
      - created_at (timestamp)
      - expires_at (timestamp)
      - used (boolean)

  2. Security
    - Enable RLS on password_reset_codes table
    - Add policies for code validation
*/

-- Create password_reset_codes table
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can validate reset codes"
  ON password_reset_codes
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email 
  ON password_reset_codes(email);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code 
  ON password_reset_codes(code);

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_reset_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_codes
  WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;