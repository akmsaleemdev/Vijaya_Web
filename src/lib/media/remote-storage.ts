import { createClient } from "@supabase/supabase-js";

export function supabaseMedia() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_STORAGE_SECRET_KEY;
  const bucket = process.env.SUPABASE_MEDIA_BUCKET;
  if (!url || !key || !bucket) {
    if (process.env.VERCEL === "1" || url || key || bucket) throw new Error("Supabase media storage is not configured.");
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(bucket);
}
