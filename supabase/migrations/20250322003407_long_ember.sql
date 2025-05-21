/*
  # Create Security Questions Table

  1. New Tables
    - security_questions
      - id (uuid, primary key)
      - email (text, unique)
      - answer (text)
      - failed_attempts (integer)
      - last_attempt (timestamp)
      - blocked_until (timestamp)

  2. Security
    - Enable RLS on security_questions table
    - Add policies for secure access
*/

-- Create security_questions table
CREATE TABLE IF NOT EXISTS security_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  answer text NOT NULL,
  failed_attempts integer DEFAULT 0,
  last_attempt timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE security_questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can read security questions"
  ON security_questions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can update security questions"
  ON security_questions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create function to handle failed attempts
CREATE OR REPLACE FUNCTION handle_failed_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- If failed_attempts reaches 3, block for 24 hours
  IF NEW.failed_attempts >= 3 THEN
    NEW.blocked_until := NOW() + INTERVAL '24 hours';
  END IF;
  
  NEW.last_attempt := NOW();
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for failed attempts
CREATE TRIGGER handle_failed_attempt_trigger
  BEFORE UPDATE ON security_questions
  FOR EACH ROW
  EXECUTE FUNCTION handle_failed_attempt();