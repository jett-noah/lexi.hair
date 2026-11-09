import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Prevent Vercel or browsers from caching this response
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables on Vercel.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Perform a real database WRITE (insert a dummy blocked record far in the past)
    const { data: inserted, error: insertError } = await supabase
      .from('appointments')
      .insert([
        {
          appointment_date: '2000-01-01',
          start_time: '00:00',
          end_time: '00:15',
          client_name: 'KEEP_ALIVE_PING',
          client_email: 'ping@lexi.hair',
          is_blocked: true,
        },
      ])
      .select('id')
      .single();

    if (insertError) throw insertError;

    // 2. Immediately DELETE the dummy record so the table stays completely clean
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', inserted.id);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      ok: true,
      message: 'Supabase write + delete keep-alive succeeded.',
      pingId: inserted.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Supabase keep-alive failed:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}