// app/api/confirm-upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Accept what your form sends (mm:ss etc.), but only store known columns.
    const {
      title,
      artist_name,
      city,
      year,
      runtime,          // number (minutes) — ok if missing
      runtime_seconds,  // optional
      runtime_mmss,     // optional "mm:ss"
      storage_bucket = 'videos',
      file_path,
      status = 'pending',
      event_id = null,
      order_index = null,
    } = body || {};

    // Required fields:
    if (!title || !artist_name || !city || !year || !file_path) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const db = supabaseService();

    // Build the row with ONLY columns that exist in your table
    const row: Record<string, any> = {
      title,
      artist_name,
      city,
      year: Number(year),
      storage_bucket,
      file_path,
      status,
      event_id,
      order_index,
    };
    if (runtime !== undefined) row.runtime = runtime;
    if (runtime_seconds !== undefined) row.runtime_seconds = runtime_seconds;
    if (runtime_mmss !== undefined) row.runtime_mmss = runtime_mmss;

    const { data, error } = await db
      .from('submissions')
      .insert([row])
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
