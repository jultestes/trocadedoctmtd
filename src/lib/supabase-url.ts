// Centralized Supabase URL/key derived from the configured client.
// Avoids depending on VITE_* env vars that don't exist in this project.
import { supabase } from "@/integrations/supabase/client";

// @ts-expect-error - accessing internal config (stable in supabase-js v2)
const restUrl: string = supabase.supabaseUrl ?? supabase.restUrl ?? "";
// @ts-expect-error - accessing internal anon key (stable in supabase-js v2)
const anonKey: string = supabase.supabaseKey ?? "";

export const SUPABASE_URL = restUrl.replace(/\/$/, "");
export const SUPABASE_ANON_KEY = anonKey;

export const getFunctionUrl = (name: string, query = "") =>
  `${SUPABASE_URL}/functions/v1/${name}${query ? (query.startsWith("?") ? query : `?${query}`) : ""}`;
