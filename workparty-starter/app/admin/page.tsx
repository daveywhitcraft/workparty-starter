// app/admin/page.tsx
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseService } from '@/lib/supabaseServer';

type EventRow = { id: number; title: string | null; slug: string };

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { err?: string };
}) {
  // ---- auth check (same cookie) ----
  const authed = cookies().get('wp_admin_auth')?.value === '1';

  // ---- server actions: login / logout ----
  async function login(formData: FormData) {
    'use server';
    const pass = String(formData.get('password') || '');
    const expected =
      process.env.WP_ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      '';

    // If no password is configured yet, don't lock you out.
    if (!expected) {
      cookies().set('wp_admin_auth', '1', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        maxAge: 60 * 60 * 8,
      });
      redirect('/admin');
    }

    if (pass !== expected) {
      redirect('/admin?err=1');
    }

    cookies().set('wp_admin_auth', '1', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 8,
    });
    redirect('/admin');
  }

  async function logout() {
    'use server';
    cookies().delete('wp_admin_auth');
    redirect('/admin');
  }

  if (!authed) {
    const wrong = searchParams?.err === '1';
    return (
      <main className="px-6 pt-28 pb-20 max-w-xl">
        <h1 className="text-3xl font-semibold mb-6">Admin</h1>

        {wrong && (
          <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm">
            Wrong password. Try again.
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="password" className="block mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="Enter password"
            />
          </div>
          <button type="submit" className="rounded border border-white/30 px-4 py-2 hover:bg-white/10">
            Log in
          </button>
        </form>
      </main>
    );
  }

  // ---- data (be tolerant to your current columns) ----
  const db = supabaseService();

  const { data: eventsRaw } = await db
    .from('events')
    .select('id, title, slug')
    .order('id', { ascending: false })
    .returns<EventRow[]>();
  const events: EventRow[] = eventsRaw ?? [];

  // IMPORTANT: select('*') so we don't fail when some columns are missing
  const { data: submissionsRaw } = await db
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });
  const submissions: any[] = submissionsRaw ?? [];

  // ---- per-row actions (only used if those columns exist) ----
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
    const order_index = raw === null || raw === '' ? null : Number(String(raw).trim());
    await supabaseService().from('submissions').update({ order_index }).eq('id', id);
    redirect('/admin');
  }

  // ---- NEW: create event (server action) ----
  async function createEvent(formData: FormData) {
    'use server';
    const title = String(formData.get('title') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const slug = String(formData.get('slug') || '').trim().toLowerCase();
    const start_at = String(formData.get('start_at') || '').trim();

    if (!title || !city || !slug || !start_at) {
      redirect('/admin?err=ev-missing');
    }

    const { data, error } = await supabaseService()
      .from('events')
      .insert({ title, city, slug, start_at })
      .select('id')
      .single();

    if (error || !data) {
      redirect('/admin?err=ev-insert');
    }

    // Jump straight to admin filtered to this event
    redirect(`/admin?event=${data.id}`);
  }

  // helpers to only show controls when the column exists
  const has = (row: any, key: string) => Object.prototype.hasOwnProperty.call(row, key);
  const fileUrl = (row: any) =>
    has(row, 'file_path') && row.file_path
      ? `/api/public-url?path=${encodeURIComponent(row.file_path)}`
      : '';

  const err = searchParams?.err;
  const eventErr =
    err === 'ev-missing'
      ? 'Please fill Title, City, Slug, and Start time.'
      : err === 'ev-insert'
      ? 'Could not create event (check Supabase).'
      : null;

  return (
    <main className="px-6 pt-28 pb-20 space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <form action={logout}>
          <button type="submit" className="rounded border border-white/30 px-3 py-1.5 hover:bg-white/10">
            Log out
          </button>
        </form>
      </div>

      {/* NEW: Create Event */}
      <section className="max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Add Event</h2>

        {eventErr && (
          <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm">
            {eventErr}
          </div>
        )}

        <form action={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <div className="mb-1 text-sm opacity-80">Title</div>
            <input
              name="title"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="WORK.PARTY Berlin 002"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-80">City</div>
            <input
              name="city"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="Berlin"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-80">Slug</div>
            <input
              name="slug"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="berlin-2025-10"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm opacity-80">Start time (ISO)</div>
            <input
              name="start_at"
              required
              className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
              placeholder="2025-10-15T19:00:00+02:00"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded border border-white/30 px-4 py-2 hover:bg-white/10"
            >
              Create event
            </button>
          </div>
        </form>
      </section>

      {/* Submissions */}
      <section className="max-w-6xl">
        <h2 className="text-xl font-semibold mb-4">Submissions</h2>

        <div className="overflow-x-auto border border-white/10 rounded">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Artist</th>
                <th className="text-left px-3 py-2">City</th>
                {/* optional columns */}
                {submissions.some(r => has(r, 'year')) && <th className="text-left px-3 py-2">Year</th>}
                {submissions.some(r => has(r, 'runtime') || has(r, 'runtime_mmss')) && (
                  <th className="text-left px-3 py-2">Runtime</th>
                )}
                {submissions.some(r => has(r, 'status')) && <th className="text-left px-3 py-2">Status</th>}
                {submissions.some(r => has(r, 'event_id')) && <th className="text-left px-3 py-2">Event</th>}
                {submissions.some(r => has(r, 'order_index')) && <th className="text-left px-3 py-2">Order</th>}
                {submissions.some(r => has(r, 'file_path')) && <th className="text-left px-3 py-2">File</th>}
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {submissions.map((row) => {
                const created = row.created_at ? new Date(row.created_at).toLocaleString() : '';
                const runtimeLabel =
                  (has(row, 'runtime_mmss') && row.runtime_mmss) ||
                  (has(row, 'runtime') && row.runtime != null ? `${row.runtime} min` : '');

                return (
                  <tr key={row.id ?? row.uuid ?? Math.random()}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs opacity-70">
                        {has(row, 'order_index') ? `#${row.order_index ?? ''}` : ''} {created ? `· ${created}` : ''}
                      </div>
                    </td>

                    <td className="px-3 py-2">{row.artist_name ?? ''}</td>
                    <td className="px-3 py-2">{row.city ?? ''}</td>
                    {has(row, 'year') && <td className="px-3 py-2">{row.year ?? ''}</td>}
                    {(has(row, 'runtime') || has(row, 'runtime_mmss')) && (
                      <td className="px-3 py-2">{runtimeLabel}</td>
                    )}

                    {/* Status (only if column exists) */}
                    {has(row, 'status') ? (
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
                          <button type="submit" className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                            Set
                          </button>
                        </form>
                      </td>
                    ) : (
                      <td className="px-3 py-2"></td>
                    )}

                    {/* Event assignment (only if column exists) */}
                    {has(row, 'event_id') ? (
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
                          <button type="submit" className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                            Set
                          </button>
                        </form>
                      </td>
                    ) : (
                      <td className="px-3 py-2"></td>
                    )}

                    {/* Order index (only if column exists) */}
                    {has(row, 'order_index') ? (
                      <td className="px-3 py-2">
                        <form action={setOrderIndex} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            type="number"
                            name="order_index"
                            defaultValue={row.order_index ?? ''}
                            className="w-20 rounded border border-white/20 bg-black/30 px-2 py-1"
                            placeholder="-"
                            step={1}
                          />
                          <button type="submit" className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                            Set
                          </button>
                        </form>
                      </td>
                    ) : (
                      <td className="px-3 py-2"></td>
                    )}

                    {/* File link (only if file_path exists) */}
                    {submissions.some(r => has(r, 'file_path')) ? (
                      <td className="px-3 py-2">
                        {fileUrl(row) ? (
                          <a href={fileUrl(row)} target="_blank" className="underline">open</a>
                        ) : (
                          ''
                        )}
                      </td>
                    ) : null}

                    {/* Quick actions (only if status exists) */}
                    <td className="px-3 py-2">
                      {has(row, 'status') ? (
                        <div className="flex gap-2">
                          <form action={setStatus}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button type="submit" className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                              Approve
                            </button>
                          </form>
                          <form action={setStatus}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="status" value="archived" />
                            <button type="submit" className="rounded border border-white/30 px-2 py-1 hover:bg-white/10">
                              Archive
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="opacity-60 text-xs">No status column</span>
                      )}
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

      {/* Events (read-only list) */}
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
