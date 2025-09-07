import { supabaseService } from '@/lib/supabaseServer';
export default async function ArchivePage() {
  const admin = supabaseService();
  const { data } = await admin.from('submissions').select('id,artist_name,title,year,city,consent_archive').eq('status','archived').order('created_at', { ascending: false });
  const rows = data || [];
  return (
    <section>
      <h1 className="title">Archive Index</h1>
      <p className="muted">Listing only. Playback lives on the Screening page during events.</p>
      <ul>
        {rows.map((r:any) => (
          <li key={r.id}>{r.artist_name} — {r.title} ({r.year || 'year'}) · {r.city || 'city'}</li>
        ))}
      </ul>
    </section>
  );
}
