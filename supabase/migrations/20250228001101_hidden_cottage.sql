/*
  # Fix schema to match form fields

  1. Changes
    - Update service_records table to match form fields
    - Add missing columns: area_cx, available_slots, unit, visited_cxs
    - Remove separate area and cx_number columns
    - Update service types to match new requirements
*/

-- Add new columns and modify existing ones
ALTER TABLE service_records DROP COLUMN IF EXISTS area;
ALTER TABLE service_records DROP COLUMN IF EXISTS cx_number;

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_records' AND column_name = 'area_cx') THEN
    ALTER TABLE service_records ADD COLUMN area_cx text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_records' AND column_name = 'available_slots') THEN
    ALTER TABLE service_records ADD COLUMN available_slots text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_records' AND column_name = 'unit') THEN
    ALTER TABLE service_records ADD COLUMN unit text NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_records' AND column_name = 'visited_cxs') THEN
    ALTER TABLE service_records ADD COLUMN visited_cxs text NOT NULL DEFAULT '';
  END IF;
END
$$;

-- Update existing records to use new service types if needed
UPDATE service_records 
SET service_type = 
  CASE 
    WHEN service_type = 'Installation' THEN 'Ativação'
    WHEN service_type = 'Maintenance' THEN 'Reparo'
    WHEN service_type = 'Repair' THEN 'Reparo'
    WHEN service_type = 'Upgrade' THEN 'Mudança Endereço'
    ELSE service_type
  END
WHERE service_type IN ('Installation', 'Maintenance', 'Repair', 'Upgrade');