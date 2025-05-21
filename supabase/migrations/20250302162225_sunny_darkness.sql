-- Check if columns exist and add them if they don't
DO $$
BEGIN
  -- Check for area_cx column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' AND column_name = 'area_cx'
  ) THEN
    ALTER TABLE service_records ADD COLUMN area_cx text NOT NULL DEFAULT '';
  END IF;

  -- Check for available_slots column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' AND column_name = 'available_slots'
  ) THEN
    ALTER TABLE service_records ADD COLUMN available_slots text NOT NULL DEFAULT '';
  END IF;

  -- Check for unit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' AND column_name = 'unit'
  ) THEN
    ALTER TABLE service_records ADD COLUMN unit text NOT NULL DEFAULT '';
  END IF;

  -- Check for visited_cxs column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' AND column_name = 'visited_cxs'
  ) THEN
    ALTER TABLE service_records ADD COLUMN visited_cxs text NOT NULL DEFAULT '';
  END IF;

  -- Check for cto_location column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_records' AND column_name = 'cto_location'
  ) THEN
    ALTER TABLE service_records ADD COLUMN cto_location text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read all service records" ON service_records;
DROP POLICY IF EXISTS "Users can insert service records" ON service_records;
DROP POLICY IF EXISTS "Only admins can update service records" ON service_records;
DROP POLICY IF EXISTS "Only admins can delete service records" ON service_records;

-- Create policies with proper permissions
CREATE POLICY "Users can read all service records"
  ON service_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert service records"
  ON service_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can update service records"
  ON service_records
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

CREATE POLICY "Only admins can delete service records"
  ON service_records
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));