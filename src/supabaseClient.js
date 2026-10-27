import { createClient } from '@supabase/supabase-js';

// Print everything Vite sees in your environment right into the browser console:
console.log('🔍 DEBUG Vite Env Object:', import.meta.env);

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 DEBUG VITE_SUPABASE_URL:', rawUrl);
console.log('🔍 DEBUG VITE_SUPABASE_ANON_KEY exists?:', Boolean(rawKey));

// Clean up any accidental quotes or whitespace and provide a safe fallback so the page ALWAYS renders:
const cleanUrl =
  rawUrl && rawUrl.trim().startsWith('http')
    ? rawUrl.trim().replace(/['"]/g, '')
    : 'https://placeholder-project.supabase.co';

const cleanKey =
  rawKey && rawKey.trim().length > 0
    ? rawKey.trim().replace(/['"]/g, '')
    : 'placeholder-anon-key';

export const supabase = createClient(cleanUrl, cleanKey);