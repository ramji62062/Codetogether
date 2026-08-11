import { createClient } from "@supabase/supabase-js";

// Read public Supabase values from environment variables.
// NEXT_PUBLIC_ variables are safe for browser usage.
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (typeof window !== "undefined") {
    console.warn(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
}

// Some beginners paste the REST endpoint (.../rest/v1) by mistake.
// We normalize it to the project base URL expected by supabase-js.
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

// Export one shared client for app-wide usage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
