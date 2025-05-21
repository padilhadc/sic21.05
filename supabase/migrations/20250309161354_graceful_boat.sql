/*
  # Update user roles and policies

  1. Changes
    - Update existing user roles to valid values
    - Add role constraint to users table
    - Update service_records policies for visitor role

  2. Security
    - Add constraint to limit role values
    - Update policies to handle visitor role
    - Ensure visitors can only read records
*/

-- First update any invalid roles to 'user' as a safe default
UPDATE users 
SET role = 'user' 
WHERE role NOT IN ('admin', 'user', 'visitante');

-- Now we can safely add the constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'user', 'visitante'));
  END IF;
END $$;

-- Update service_records policies to handle visitor role
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can insert service records" ON service_records;
  DROP POLICY IF EXISTS "Users can read all service records" ON service_records;
  DROP POLICY IF EXISTS "Only admins can delete service records" ON service_records;
  DROP POLICY IF EXISTS "Only admins can update service records" ON service_records;
END $$;

-- Recreate policies with proper role checks
CREATE POLICY "Users can insert service records"
  ON service_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND role IN ('admin', 'user')
    )
  );

CREATE POLICY "Users can read all service records"
  ON service_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete service records"
  ON service_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update service records"
  ON service_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND role = 'admin'
    )
  );