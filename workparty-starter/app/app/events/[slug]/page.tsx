export const runtime = "nodejs";
export const revalidate = 0; // always fresh

import { createClient } from "@supabase/supabase-js";

type EventRow = {
  id: number;
  slug: string;
  city?: string | null;
  title?: string | null;
  start_at?: string | null;
  venue_name?: string | null;
  address?: string | null;
  description?: string | null;
  status?: string | null;
};

type Submission = {
  id: string;
  title?: string | null;
  artist_name?: string | null;
  city?: string | null;
  year?: number | null;
  status?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  created_at?: string | null;
};

export default async function EventPage({ params }: { params: { slug: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, anon, { auth: { persistSession: false } });

  // 1) load event
  const { data: evs, error: evErr } = await sb
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .limit(1);

  if (evErr || !evs || evs.length === 0) {
    return (
      <section style={{ padding: 24 }}>
        <h1>Event</h1>
        <p style={{ color: "crimson" }}>Event not found.</p>
      </section>
    );
  }
  const ev = evs[0] as EventRow;

  // 2) load approved submissions for this event
  const { data: subs, error: subErr } = await sb
    .from("submissions")
    .select("id, title, artist_name, city, year, status, file_path, storage_bucket, created_at")
    .eq("event_id", ev.id)
    .in("status", ["approved", "archived"])
    .order("created_at", { ascending: false });

  const rows = (subs as Submission[]) || [];

  return (
    <section style={{ padding: 24, maxWidth: 900 }}>
      <a href="/events" style={{ fontSize: 14 }}>&larr; All events</a>
      <h1 style={{ marginTop: 8 }}>{ev.title || ev.slug}</h1>
      <div style={{ opacity: 0.75, marginTop: 4 }}>
        {(ev.city || "")}
        {ev.start_at ? ` · ${new Date(ev.start_at).toLocaleString()}` : ""}
        {ev.venue_name ? ` · ${ev.venue_name}` : ""}
      </div>
      {ev.address ? <div style={{ opacity: 0.75 }}>{ev.address}</div> : null}
      {ev.description ? <p style={{ marginTop: 12 }}>{ev.description}</p> : null}

      <div style={{ marginTop: 12 }}>
        <a href={`/events/${ev.slug}/screen`} className="btn">Open screening player</a>
      </div>

      <h2 style={{ marginTop: 24 }}>Program</h2>
      {subErr ? (
        <p style={{ color: "crimson" }}>Error loading program: {subErr.message}</p>
      ) : rows.length === 0 ? (
        <p>No items yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10, marginTop: 8 }}>
          {rows.map((r) => (
            <li key={r.id} style={{ border: "1px solid #343434", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{r.artist_name || "Unknown artist"}</strong> — {r.title || "Untitled"}
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {r.year ? `(${r.year})` : ""} {r.city ? `· ${r.city}` : ""}
                    {r.status ? ` · ${r.status}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, alignSelf: "flex-start" }}>
                  Added: {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
