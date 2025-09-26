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
  const { data } = await db
    .from('submissions')
    .select('*')
    .eq('status', 'approved')
    .eq('event_id', eventId);

  const rows = (data || []).slice();

  // Ascending numeric order by your Admin number, then created_at
  rows.sort((a: any, b: any) => {
    const ai = a.order_index == null || a.order_index === '' ? Number.POSITIVE_INFINITY : Number(a.order_index);
    const bi = b.order_index == null || b.order_index === '' ? Number.POSITIVE_INFINITY : Number(b.order_index);
    if (ai !== bi) return bi - ai;
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return ta - tb;
  });

  return rows;
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
      <p className="muted">Playlist order follows the numbers set in Admin.</p>

      {/* Force a simple top-to-bottom column so #1 appears first */}
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
