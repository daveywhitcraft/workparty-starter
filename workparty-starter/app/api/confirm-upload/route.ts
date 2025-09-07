import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const body = await req.json();
  const { id } = body as { id: string };

  const admin = supabaseService();
  const { error } = await admin
    .from('submissions')
    .update({ status: 'pending' })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
