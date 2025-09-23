// app/api/confirm-upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    // tolerate bad/missing JSON
    const raw = (await req.json().catch(() => ({}))) as Record<string, any>;

    // coerce/trim everything
    const title = String(raw.title ?? '').trim();
    const artist_name = String(raw.artist_name ?? '').trim();
    const city = String(raw.city ?? '').trim();
    const file_path = String(raw.file_path ?? '').trim();

    // year & runtime can arrive as strings; coerce to numbers if possible
    const yearNum =
      typeof raw.year === 'number'
        ? raw.year
        : Number(String(raw.year ?? '').trim());
    const runtimeNum =
      typeof raw.runtime === 'number'
        ? raw.runtime
        : Number(String(raw.runtime ?? '').trim());
    const email =
      raw.email != null && String(raw.email).trim() !== ''
        ? String(raw.email).trim()
        : null;

    // validate requireds and report which one failed
    if (!title) return NextResponse.json({ error: "missing 'title'" }, { status: 400 });
    if (!artist_name) return NextResponse.json({ error: "missing 'artist_name'" }, { status: 400 });
    if (!city) return NextResponse.json({ error: "missing 'city'" }, { status: 400 });
    if (!file_path) return NextResponse.json({ error: "missing 'file_path'" }, { status: 400 });
    if (!yearNum || Number.isNaN(yearNum))
      return NextResponse.json({ error: "missing or invalid 'year'" }, { status: 400 });

    const row = {
      title,
      artist_name,
      city,
      year: yearNum,
      runtime: Number.isNaN(runtimeNum) ? null : runtimeNum, // optional
      file_path,
      email,                                                 // optional/private
      status: 'pending',
    };

    const { data, error } = await supabaseService()
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
