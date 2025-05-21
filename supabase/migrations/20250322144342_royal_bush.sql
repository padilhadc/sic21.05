/*
  # Add Notifications Table and Update Service Records

  1. New Tables
    - notifications
      - id (uuid, primary key)
      - message (text)
      - created_by (uuid, references users)
      - created_at (timestamp)
      - min_display_time (integer)
      - expires_at (timestamp)

  2. Security
    - Enable RLS on notifications table
    - Add policies for admin creation and user reading
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  min_display_time integer DEFAULT 5,
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ));

CREATE POLICY "Users can read notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (true);