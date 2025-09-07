import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use whichever key name you already have in Vercel
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || // last fallback
  '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SERVICE_KEY
);

// 🔴 If your table has a different name, change this:
const TABLE = 'submissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      artist_name,
      city,
      year,
      runtime,
      file_path,
    } = body || {};

    // Basic checks
    if (!title || !artist_name || !city || !year || !runtime || !file_path) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Insert a new row
    const { error } = await supabase
      .from(TABLE)
      .insert([
        {
          title,
          artist_name,
          city,
          year: Number(year),
          runtime,
          file_path,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
