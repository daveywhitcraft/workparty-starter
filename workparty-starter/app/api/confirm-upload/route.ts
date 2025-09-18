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
      runtime,     // rounded minutes from the form
      file_path,
    } = body || {};

    if (!title || !artist_name || !city || !year || !file_path) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const db = supabaseService();

    const row = {
      title,
      artist_name,
      city,
      year: Number(year),
      runtime: runtime ?? null,
      file_path,
    };

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
