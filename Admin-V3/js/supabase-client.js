import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://llnerxtpeqbwszrqzfkw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_LTLN-ZnpAjgT8NICCf7eKA_2vD14Cy8";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);