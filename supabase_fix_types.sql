-- Fix: Reset group types to NULL so they appear in both Marcas and Retos tabs
-- Only 'default' stays as 'folder'. All others become unclassified (show in both tabs).
-- Run this in Supabase > SQL Editor > New Query

UPDATE waypoint_groups
  SET type = NULL
  WHERE type = 'challenge' AND id != 'default';

-- Verify result:
SELECT id, name, type FROM waypoint_groups ORDER BY name;
