/*
  # Create Storage Bucket for Service Images

  1. Changes
    - Create service-images bucket if it doesn't exist
    - Add RLS policies for bucket access
    
  2. Security
    - Enable public access for image URLs
    - Restrict uploads to authenticated users
*/

-- Create service-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for authenticated uploads
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images' AND
  auth.role() = 'authenticated'
);

-- Create storage policy for public downloads
CREATE POLICY "Public users can download images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');