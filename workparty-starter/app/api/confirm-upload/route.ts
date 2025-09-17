// app/api/confirm-upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      title,
      artist_name,
      city,
      year,
      // Optional runtime fields our submit page may send
      runtime,                 // rounded minutes (number)
      runtime_seconds,         // optional
      runtime_mmss,            // optional "mm:ss"
      runtime_minutes_exact,   // optional

      storage_bucket = 'videos',
      file_path,
      status = 'pending',
      event_id = null,
      order_index = null,
    } = body || {};

    // Validate required fields only
    if (!title || !artist_name || !city || !year || !file_path) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const db = supabaseService(); // uses the same URL + SERVICE ROLE as Admin

    const { data, error } = await db
      .from('submissions')
      .insert([
        {
          title,
          artist_name,
          city,
          year: Number(year),
          runtime,
          runtime_seconds,
          runtime_mmss,
          runtime_minutes_exact,
          storage_bucket,
          file_path,
          status,
          event_id,
          order_index,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('confirm-upload insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error('confirm-upload server error:', err);
    return NextResponse.json(
      { error: err?.message || 'server error' },
      { status: 500 }
    );
  }
}
