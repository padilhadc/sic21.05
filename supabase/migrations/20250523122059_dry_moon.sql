/*
  # Recreate efficiency_history table

  1. New Table
    - `efficiency_history`
      - `id` (uuid, primary key)
      - `operator_name` (text)
      - `total_services` (integer)
      - `period_end` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for authenticated users to read data
*/

-- Create the efficiency_history table
CREATE TABLE IF NOT EXISTS efficiency_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name text NOT NULL,
  total_services integer NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')
);

-- Enable Row Level Security
ALTER TABLE efficiency_history ENABLE ROW LEVEL SECURITY;

-- Create policy for reading data
CREATE POLICY "Allow authenticated users to read efficiency history"
  ON efficiency_history
  FOR SELECT
  TO authenticated
  USING (true);