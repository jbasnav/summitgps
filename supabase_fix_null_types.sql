-- Fix: Set type = 'folder' for all groups that have NULL type
-- This fixes groups that were incorrectly reset by supabase_fix_types.sql
-- Run this ONCE in Supabase > SQL Editor > New Query

-- 1. Set all NULL types to 'folder' (marcadores por defecto)
UPDATE waypoint_groups
  SET type = 'folder'
  WHERE type IS NULL;

-- 2. Also change the column default from NULL to 'folder' for future inserts
ALTER TABLE waypoint_groups
  ALTER COLUMN type SET DEFAULT 'folder';

-- 3. Verify the fix:
SELECT id, name, type FROM waypoint_groups ORDER BY name;
