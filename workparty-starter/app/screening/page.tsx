import { supabaseService } from '@/lib/supabaseServer';

async function getRows() {
  const admin = supabaseService();
  const { data } = await admin.from('submissions').select('*').eq('status','approved').order('order_index', { ascending: false }).order('created_at', { ascending: true });
  return data || [];
}

export default async function ScreeningPage() {
  const rows = await getRows();
  return (
    <section>
      <h1 className="title">Current Screening</h1>
      <p className="muted">Playlist order follows the numbers set in Admin.</p>
      <div className="grid">
        {rows.map((r:any) => (
          <div className="card" key={r.id}>
            <b>{r.title}</b> <span className="muted">· {r.artist_name}</span>
            <div style={{marginTop:8}}>
              <video controls style={{width:'100%'}} src={`/api/public-url?path=${encodeURIComponent(r.file_path)}`}></video>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
