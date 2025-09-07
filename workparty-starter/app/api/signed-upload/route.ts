import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const body = await req.json();
  const { path, meta } = body as { path: string, meta: Record<string, any> };

  const admin = supabaseService();

  // Create DB row with pending status
  const { data: row, error: rowErr } = await admin
    .from('submissions')
    .insert({
      artist_name: meta.artist_name ?? null,
      email: meta.email ?? null,
      city: meta.city ?? null,
      title: meta.title ?? null,
      year: meta.year ?? null,
      runtime: meta.runtime ?? null,
      aspect_ratio: meta.aspect_ratio ?? null,
      resolution: meta.resolution ?? null,
      synopsis: meta.synopsis ?? null,
      credits: meta.credits ?? null,
      file_path: path,
      consent_archive: !!meta.consent_archive
    })
    .select('id')
    .single();

  if (rowErr || !row) {
    return NextResponse.json({ error: rowErr?.message || 'row insert issue' }, { status: 500 });
  }

  // Create a signed upload URL for this path
  const { data: signed, error: signErr } = await admin
    .storage
    .from('videos')
    .createSignedUploadUrl(path);

  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message || 'sign issue' }, { status: 500 });
  }

  return NextResponse.json({ rowId: row.id, signedUrl: signed.signedUrl, token: signed.token });
}
