import { createClient } from "@supabase/supabase-js";

export const siteMediaBucket = () => process.env.SUPABASE_SITE_MEDIA_BUCKET || "site-media";
export const documentsBucket = () => process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";

export function supabaseMedia(bucket = siteMediaBucket()) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_SECRET_KEY;
  if (!url || !key) {
    if (process.env.VERCEL === "1" || url || key) throw new Error("Supabase media storage is not configured.");
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(bucket);
}
