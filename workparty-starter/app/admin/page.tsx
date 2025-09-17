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
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return createClient(url, key);
}

export default async function AdminPage() {
  const authed = cookies().get('wp_admin_auth')?.value === '1';

  // -------- login action --------
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

  // -------- create event action --------
  async function createEvent(formData: FormData) {
    'use server';
    const supabase = getAdminClient();

    const cityRaw = String(formData.get('city') || '').trim();
    const dateRaw = String(formData.get('date') || '').trim(); // YYYY-MM-DD from <input type="date">

    if (!cityRaw || !dateRaw) {
      redirect('/admin?err=missing');
    }

    const cityTitle =
      cityRaw
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w ? w[0].toUpperCase() + w.slice(1) : '')
        .join(' ')
        .trim() || 'City';

    // Compact date for title and slug
    const ymd = dateRaw.replaceAll('-', ''); // 20250926

    const title = `${cityTitle} ${ymd}`;
    const slug =
      `${cityRaw.toLowerCase().replace(/\s+/g, '-')}-${ymd}`; // berlin-20250926

    const { error } = await supabase
      .from('events')
      .insert([{ slug, city: cityTitle, title }]);

    // Always return to admin page (simple flow)
    redirect('/admin');
  }

  // If not logged in, show password form
  if (!authed) {
    return (
      <main className="px-6 pt-28 pb-20 max-w-xl">
        <h1 className="text-3xl font-semibold mb-6">Admin</h1>
        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="password" className="block mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="Enter password"
              required
            />
          </div>
          <button className="rounded border border-white/30 px-4 py-2 hover:bg-white/10">
            Log in
          </button>
        </form>
      </main>
    );
  }

  // Logged in: fetch recent events
  const supabase = getAdminClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, slug, city, title')
    .order('id', { ascending: false })
    .returns<EventRow[]>();

  return (
    <main className="px-6 pt-28 pb-20">
      <h1 className="text-3xl font-semibold mb-8">Admin</h1>

      {/* Create Event */}
      <section className="max-w-2xl mb-12">
        <h2 className="text-xl font-semibold mb-4">Create event</h2>
        <form action={createEvent} className="space-y-5">
          <div>
            <label htmlFor="city" className="block mb-1">City</label>
            <input
              id="city"
              name="city"
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="Berlin"
              required
            />
          </div>

          <div>
            <label htmlFor="date" className="block mb-1">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              required
            />
          </div>

          <button className="rounded border border-white/30 px-4 py-2 hover:bg-white/10">
            Save event
          </button>
        </form>
      </section>

      {/* Events list */}
      <section className="max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Events</h2>
        <div className="divide-y divide-white/10 border border-white/10 rounded">
          {(events || []).map((ev) => (
            <div key={ev.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{ev.title}</div>
                <div className="text-sm opacity-70">{ev.slug}</div>
              </div>
              <div className="text-sm opacity-70">{ev.city}</div>
            </div>
          ))}
          {(!events || events.length === 0) && (
            <div className="px-4 py-3 text-sm opacity-70">No events yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
