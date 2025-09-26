import { supabaseService } from '@/lib/supabaseServer';

async function getCurrentEvent() {
  const db = supabaseService();
  // Prefer newest by start_at, then by id
  const { data, error } = await db
    .from('events')
    .select('id, title, slug, start_at')
    .order('start_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
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

  // Force numeric ascending by Admin order; null/empty go last. Tie-break by created_at ASC.
  rows.sort((a: any, b: any) => {
    const aiRaw = a.order_index;
    const biRaw = b.order_index;
    const ai = aiRaw === null || aiRaw === undefined || aiRaw === '' ? Number.POSITIVE_INFINITY : Number(aiRaw);
    const bi = biRaw === null || biRaw === undefined || biRaw === '' ? Number.POSITIVE_INFINITY : Number(biRaw);
    if (ai !== bi) return ai - bi;
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
      <div className="grid">
        {rows.map((r:any) => (
          <div className="card" key={r.id}>
            <b>{r.title}</b> <span className="muted">· {r.artist_name}</span>
            <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>
              {r.order_index != null && r.order_index !== '' ? `#${r.order_index}` : ''}
            </div>
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
