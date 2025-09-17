// app/admin/page.tsx
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type EventRow = {
  id: number;
  slug: string;
  city: string | null;
  title: string | null;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return createClient(url, key);
}

export default async function AdminPage() {
  const authed = cookies().get('wp_admin_auth')?.value === '1';

  async function login(formData: FormData) {
    'use server';
    const pass = String(formData.get('password') || '');
    const expected =
      process.env.WP_ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      '';
    if (pass === expected && expected) {
      cookies().set('wp_admin_auth', '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
      });
    }
    redirect('/admin');
  }

  async function createEvent(formData: FormData) {
    'use server';
    const supabase = getAdminClient();

    const cityRaw = String(formData.get('c
