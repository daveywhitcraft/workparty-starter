// app/admin/page.tsx
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseService } from '@/lib/supabaseServer';

type EventRow = {
  id: number;
  title: string | null;
  slug: string;
};

type Submission = {
  id: string;
  created_at: string | null;
  title: string | null;
  artist_name: string | null;
  city: string | null;
  year: number | null;
  runtime: number | null;          // rounded minutes (legacy)
  runtime_mmss?: string | null;    // optional
  status: string | null;           // pending | approved | archived
  storage_bucket: string | null;   // usually "videos"
  file_path: string | null;
  event_id: number | null;
  order_index?: number | null;
};

export default async function AdminPage() {
  // ---- auth gate (same cookie your login sets) ----
  const authed = cookies().get('wp_admin_auth')?.value === '1';

  // server action: login (kept simple; uses env var like before)
  async function login(formData: FormData) {
    'use server';
    const pass = String(formData.get('password') || '');
    const expected =
      process.env.WP_ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      '';
    if (pass && expected && pass === expected) {
      cookies().set('wp_admin_auth', '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
      });
    }
    redirect('/admin');
  }

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

  // ---- data fetch (service key on the server) ----
  const db = supabaseService();

  const { data: events = [] } = await db
    .from('events')
    .select('id, title, slug')
    .order('id', { ascending: false })
    .returns<EventRow[]>();

  const { data: submissions = [] } = await db
    .from('submissions')
    .select(
      'id, created_at, title, artist_name, city, year, runtime, runtime_mmss, status, storage_bucket, file_path, event_id, order_index'
    )
    .order('id', { ascending: false })
    .limit(200)
    .returns<Submission[]>();

  // ---- server actions for per-row controls ----
  async function setStatus(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const status = String(formData.get('status') || '');
    if (!id || !status) redirect('/admin');
    await supabaseService().from('submissions').update({ status }).eq('id', id);
    redirect('/admin');
  }

  async function setEvent(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const ev = formData.get('event_id');
    const event_id = ev === null || ev === '' ? null : Number(ev);
    if (!id) redirect('/admin');
    await supabaseService().from('submissions').update({ event_id }).eq('id', id);
    redirect('/admin');
  }

  async function setOrderIndex(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const raw = formData.get('order_index');
    if (!id) redirect('/admin');
    // Allow clearing the order to NULL
    const order_index =
      raw === null || raw === '' ? null : Number(String(raw).trim());
    await supabaseService().from('submissions').update({ order_index }).eq('id', id);
    redirect('/admin');
  }

  const fileUrl = (row: Submission) =>
    row.file_path
      ? `/api/public-url?path=${encodeURIComponent(row.file_path)}`
      : '';

  return (
    <main className="px-6 pt-28 pb-20 space-y-12">
      <h1 className="text-3xl font-semibold">Admin</h1>

      {/* Submissions management */}
      <section className="max-w-6xl">
        <h2 className="text-xl font-semibold mb-4">Submissions</h2>

        <div className="overflow-x-auto border border-white/10 rounded">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Artist</th>
                <th className="text-left px-3 py-2">City</th>
                <th className="text-left px-3 py-2">Year</th>
                <th className="text-left px-3 py-2">Runtime</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Event</th>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">File</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {submissions.map((row) => {
                const runtimeLabel =
                  row.runtime_mmss || (row.runtime != null ? `${row.runtime} min` : '');
                const created =
                  row.created_at ? new Date(row.created_at).toLocaleString() : '';
                return (
                  <tr key={row.id}>
                    {/* Title + meta */}
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs opacity-70">
                        #{row.order_index ?? ''} · {created}
                      </div>
                    </td>

                    <td className="px-3 py-2">{row.artist_name}</td>
                    <td className="px-3 py-2">{row.city}</td>
                    <td className="px-3 py-2">{row.year ?? ''}</td>
                    <td className="px-3 py-2">{runtimeLabel}</td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <form action={setStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <select
                          name="status"
                          defaultValue={row.status || 'pending'}
                          className="rounded border border-white/20 bg-black/30 px-2 py-1"
                        >
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="archived">archived</option>
                        </select>
                        <button className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                          Set
                        </button>
                      </form>
                    </td>

                    {/* Event assignment */}
                    <td className="px-3 py-2">
                      <form action={setEvent} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <select
                          name="event_id"
                          defaultValue={row.event_id ?? ''}
                          className="rounded border border-white/20 bg-black/30 px-2 py-1"
                        >
                          <option value="">none</option>
                          {events.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.title ?? e.slug}
                            </option>
                          ))}
                        </select>
                        <button className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                          Set
                        </button>
                      </form>
                    </td>

                    {/* Order index editor */}
                    <td className="px-3 py-2">
                      <form action={setOrderIndex} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="number"
                          name="order_index"
                          defaultValue={row.order_index ?? ''}
                          className="w-20 rounded border border-white/20 bg-black/30 px-2 py-1"
                          placeholder="—"
                          step={1}
                        />
                        <button className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                          Set
                        </button>
                      </form>
                    </td>

                    {/* File link */}
                    <td className="px-3 py-2">
                      {row.file_path ? (
                        <a href={fileUrl(row)} target="_blank" className="underline">
                          open
                        </a>
                      ) : (
                        ''
                      )}
                    </td>

                    {/* Quick actions */}
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                            Approve
                          </button>
                        </form>
                        <form action={setStatus}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                            Archive
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {submissions.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm opacity-70" colSpan={10}>
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Events list (read-only) */}
      <section className="max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Events</h2>
        <div className="divide-y divide-white/10 border border-white/10 rounded">
          {events.map((ev) => (
            <div key={ev.id} className="px-4 py-3">
              <div className="font-medium">{ev.title ?? ev.slug}</div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="px-4 py-3 text-sm opacity-70">No events yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
