import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServer';

export async function GET() {
  const admin = supabaseService();
  const { data, error } = await admin.from('submissions').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data });
}
