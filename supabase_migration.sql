-- Migration: Separate Retos from Marcas + Community feature
-- Run this in Supabase > SQL Editor > New Query

-- 1. Add 'type' column to waypoint_groups (folder | challenge)
ALTER TABLE waypoint_groups
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT NULL;

-- 2. Add 'is_public' to waypoint_groups
ALTER TABLE waypoint_groups
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- 3. Add 'is_public' to tracks
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- 4. Set 'default' group as folder type
UPDATE waypoint_groups SET type = 'folder' WHERE id = 'default';

-- 5. Create profiles table for community display names
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_own_write" ON profiles FOR ALL USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Public read policy for tracks (own + public)
DO $$ BEGIN
  CREATE POLICY "tracks_public_read" ON tracks FOR SELECT USING (is_public = true OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Public read policy for waypoint_groups (own + public)
DO $$ BEGIN
  CREATE POLICY "groups_public_read" ON waypoint_groups FOR SELECT USING (is_public = true OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Public read policy for waypoints (own + public track)
DO $$ BEGIN
  CREATE POLICY "waypoints_public_read" ON waypoints FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM tracks WHERE tracks.id = waypoints.track_id AND tracks.is_public = true)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
