import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dykkgqyrhgjtosifkpmn.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_A9J2GZeryQfhEBp9m_5NZg_tLpzOtVg';
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
