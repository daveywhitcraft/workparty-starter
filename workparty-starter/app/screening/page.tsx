import { supabaseService } from '@/lib/supabaseServer';

async function getCurrentEvent() {
  const db = supabaseService();
  const { data } = await db
    .from('events')
    .select('id, title, slug, start_at')
    .order('start_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return null;
  return data[0];
}

async function getEventSubmissions(eventId: number) {
  const db = supabaseService();
  const { data, error } = await db
    .from('submissions')
    .select('id, title, artist_name, file_path, status, event_id, order_index, created_at')
    .eq('status', 'approved')
    .eq('event_id', eventId)
    // Admin numbers: 1 plays first, then 2, 3, ...
    .order('order_index', { ascending: true, nullsFirst: false })
    // tie breakers
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export default async function ScreeningPage() {
  const ev = await getCurrentEvent();
  if (!ev) {
    return (
      <section>
        <h1 className="title">Current Screening</h1>
        <p className="muted" style={{ marginTop: 8 }}>No event found yet.</p>
      </section>
    );
  }

  const rows = await getEventSubmissions(ev.id);

  return (
    <section>
      <h1 className="title">Current Screening</h1>
      <p className="muted">Playlist follows the numbers set in Admin.</p>

      <div className="grid" style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r: any) => (
          <div className="card" key={r.id}>
            <b>#{r.order_index ?? ''} {r.title}</b> <span className="muted">· {r.artist_name}</span>
            <div style={{ marginTop: 8 }}>
              <video
                controls
                style={{ width: '100%' }}
                src={`/api/public-url?path=${encodeURIComponent(r.file_path)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
