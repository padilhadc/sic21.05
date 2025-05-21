/*
  # Update service types and ensure admin-only deletion

  1. Changes
    - Add a trigger to log service record deletions to audit_logs table
    - Ensure RLS policies are properly set for admin-only deletion
*/

-- Create a trigger function to log deletions
CREATE OR REPLACE FUNCTION log_service_record_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes
  ) VALUES (
    auth.uid(),
    'DELETE',
    'service_records',
    OLD.id,
    jsonb_build_object(
      'deleted_record', row_to_json(OLD)
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'service_record_deletion_trigger'
    AND tgrelid = 'service_records'::regclass
  ) THEN
    CREATE TRIGGER service_record_deletion_trigger
    BEFORE DELETE ON service_records
    FOR EACH ROW
    EXECUTE FUNCTION log_service_record_deletion();
  END IF;
END
$$;

-- Ensure the RLS policy for deletion exists and is properly configured
DROP POLICY IF EXISTS "Only admins can delete service records" ON service_records;

CREATE POLICY "Only admins can delete service records"
  ON service_records
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));