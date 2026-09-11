import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client for Storage. Uses the service-role key, so this
// module must NEVER be imported into client components. The bucket is private;
// files are served to the owner via short-lived signed URLs.
//
// Required env vars (add in .env and the Vercel project):
//   SUPABASE_URL                 e.g. https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    Project Settings → API → service_role key
export const DOCUMENTS_BUCKET = "documents";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
