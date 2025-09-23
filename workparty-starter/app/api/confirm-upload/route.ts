// app/api/confirm-upload/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

type Body = {
  title: string;
  artist_name: string;
  city: string;
  year: number;
  runtime: number; // minutes (rounded)
  storage_bucket: string;
  file_path: string;
  email?: string | null; // NEW optional
  event_id?: number | null;
};

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as Partial<Body>;

    // minimal checks
    if (
      !b?.title ||
      !b?.artist_name ||
      !b?.city ||
      typeof b?.year !== 'number' ||
      typeof b?.runtime !== 'number' ||
      !b?.storage_bucket ||
      !b?.file_path
    ) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // sanitize/normalize email lightly
    const email = (b.email || '').toString().trim() || null;

    const row = {
      title: b.title,
      artist_name: b.artist_name,
      city: b.city,
      year: b.year,
      runtime: b.runtime,
      storage_bucket: b.storage_bucket,
      file_path: b.file_path,
      status: 'pending',
      event_id: b.event_id ?? null,
      email, // NEW
    };

    const { data, error } = await supabaseService()
      .from('submissions')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'server error' },
      { status: 500 }
    );
  }
}
