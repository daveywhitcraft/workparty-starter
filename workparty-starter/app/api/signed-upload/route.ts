import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Must exist in Vercel → Project → Settings → Environment Variables
// NEXT_PUBLIC_SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY   (service role key, not anon)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'videos'; // <- your only bucket
const MAX_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, size } = await req.json();

    if (!filename || !contentType || typeof size !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }
    if (contentType !== 'video/mp4') {
      return NextResponse.json({ error: 'Only MP4 allowed' }, { status: 400 });
    }

    const objectPath = `${Date.now()}-${filename}`;

    // Create a signed *upload* URL (multipart/form-data POST with token)
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error || !data?.signedUrl || !data?.token) {
      return NextResponse.json({ error: 'Could not create signed upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl, // POST form-data here
      token: data.token,         // include in form-data
      path: objectPath,          // save this; used later to play the file
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
