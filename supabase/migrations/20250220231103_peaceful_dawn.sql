/*
  # Initial Schema Setup

  1. Tables
    - users
      - id (uuid, primary key)
      - email (text)
      - role (text)
      - created_at (timestamp)
    
    - service_records
      - id (uuid, primary key)
      - operator_name (text)
      - company_name (text)
      - technician_name (text)
      - area (text)
      - cx_number (text)
      - contract_number (text)
      - service_type (text)
      - street (text)
      - neighborhood (text)
      - cto_location (text)
      - created_by (uuid, references users)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - audit_logs
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - action (text)
      - table_name (text)
      - record_id (uuid)
      - changes (jsonb)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Create service_records table
CREATE TABLE service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name text NOT NULL,
  company_name text NOT NULL,
  technician_name text NOT NULL,
  area text NOT NULL,
  cx_number text NOT NULL,
  contract_number text NOT NULL,
  service_type text NOT NULL,
  street text NOT NULL,
  neighborhood text NOT NULL,
  cto_location text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

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

CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));