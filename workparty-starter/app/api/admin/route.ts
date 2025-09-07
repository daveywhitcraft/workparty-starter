import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const auth = req.headers.get('x-admin');
  if (auth !== process.env.ADMIN_PASS) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id, status, order_index } = await req.json();
  const admin = supabaseService();
  if (status) {
    const { error } = await admin.from('submissions').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (typeof order_index === 'number') {
    const { error } = await admin.from('submissions').update({ order_index }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
