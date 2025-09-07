import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'uploads'; // change if your bucket name differs

function guessMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'm4v') return 'video/x-m4v';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  return 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    if (!path) return new Response('Missing path', { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      return new Response('Signed URL error', { status: 500 });
    }

    const range = req.headers.get('range') ?? undefined;

    const upstream = await fetch(data.signedUrl, {
      headers: range ? { Range: range } : undefined,
    });

    const headers = new Headers();
    ['accept-ranges','content-length','content-range','content-type','etag','last-modified','cache-control']
      .forEach(h => { const v = upstream.headers.get(h); if (v) headers.set(h, v); });

    if (!headers.has('content-type')) headers.set('content-type', guessMime(path));
    if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response('Server error', { status: 500 });
  }
}
