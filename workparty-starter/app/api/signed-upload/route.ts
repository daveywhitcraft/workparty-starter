import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // needs the "service role" key, not anon
);

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, size } = await req.json();

    if (!filename || !contentType || !size) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (size > 250 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Put everything into "uploads/" folder inside your bucket
    const filePath = `uploads/${Date.now()}-${filename}`;

    const { data, error } = await supabase.storage
      .from('uploads') // bucket name must match your Supabase bucket
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error('Supabase signed URL error:', error);
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: data.signedUrl,
      path: filePath,
    });
  } catch (err: any) {
    console.error('Signed upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
