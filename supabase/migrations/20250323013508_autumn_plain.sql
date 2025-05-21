/*
  # Fix Storage Bucket Configuration

  1. Changes
    - Ensure storage schema exists
    - Create bucket with proper configuration
    - Set up RLS policies correctly
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create storage.buckets table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner uuid DEFAULT auth.uid(),
    CONSTRAINT buckets_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id)
);

-- Create service-images bucket
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
    'service-images',
    'service-images',
    true,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
    public = EXCLUDED.public,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage.objects table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
    CONSTRAINT objects_buckets_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id),
    CONSTRAINT objects_owner_fkey FOREIGN KEY (owner) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public users can download images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'service-images'
    AND (storage.foldername(name))[1] = 'public'
);

CREATE POLICY "Public users can download images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');

CREATE POLICY "Users can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (auth.uid() = owner);

-- Create bucket access policies
CREATE POLICY "Public users can access service-images bucket"
ON storage.buckets
FOR SELECT
TO public
USING (name = 'service-images');