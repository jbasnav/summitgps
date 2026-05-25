import { createClient } from "@supabase/supabase-js";

// Read Supabase environment variables from Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Detect if Supabase is properly configured in the environment
export const isSupabaseConfigured = Boolean(
  supabaseUrl.trim() && 
  supabaseAnonKey.trim() && 
  supabaseUrl !== "YOUR_SUPABASE_URL" &&
  supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY"
);

// Instantiate client. Use placeholder strings if not configured to prevent crashes during initialization.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);
