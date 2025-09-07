import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });
  const admin = supabaseService();
  // Create a short-lived signed URL for admin preview and screening playback
  const { data, error } = await admin.storage.from('videos').createSignedUrl(path, 60 * 60); // 60 minutes
  if (error || !data) return NextResponse.json({ error: error?.message || 'sign issue' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, 302);
}
