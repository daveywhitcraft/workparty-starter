export const runtime = "nodejs";

import { createClient } from "@supabase/supabase-js";

type EventRow = {
  id: number;
  slug: string;
  city?: string | null;
  title?: string | null;
  start_at?: string | null;
  status?: string | null;
  description?: string | null;
};

export default async function EventsPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, anon, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("events")
    .select("id, slug, city, title, start_at, status, description")
    .order("start_at", { ascending: false });

  const events: EventRow[] = data || [];

  return (
    <section style={{ padding: 24, maxWidth: 800 }}>
      <h1>Events</h1>

      {error ? (
        <p style={{ color: "crimson" }}>Error: {error.message}</p>
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 16, display: "grid", gap: 16 }}>
          {events.map((ev) => (
            <li key={ev.id} style={{ border: "1px solid #343434", padding: 12, borderRadius: 8 }}>
              <h2 style={{ marginBottom: 4 }}>
                <a href={`/events/${ev.slug}`}>{ev.title || ev.slug}</a>
              </h2>
              <div style={{ fontSize: 14, opacity: 0.7 }}>
                {ev.city || ""} ·{" "}
                {ev.start_at ? new Date(ev.start_at).toLocaleString() : ""}
              </div>
              {ev.description ? <p style={{ marginTop: 6 }}>{ev.description}</p> : null}
              <div style={{ marginTop: 8 }}>
                <a href={`/events/${ev.slug}`}>View details</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
