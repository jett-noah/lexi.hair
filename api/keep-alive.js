import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables on Vercel.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Run a lightweight query (fetching at most 1 row ID) to register database activity
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      message: 'Supabase keep-alive ping succeeded.',
      timestamp: new Date().toISOString(),
      rowsChecked: data ? data.length : 0,
    });
  } catch (error) {
    console.error('Supabase keep-alive failed:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}