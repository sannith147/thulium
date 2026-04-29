import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!serviceRoleKey &&
  !supabaseUrl.includes("example.supabase.co") &&
  serviceRoleKey !== "demo-service-role-key";

if (!isSupabaseConfigured) {
  console.warn("Supabase env not configured (or placeholder). Using demo-mode responses where possible.");
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, serviceRoleKey) : null;
