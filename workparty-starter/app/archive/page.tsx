export const runtime = "nodejs";
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";

type Submission = {
  id: string;
  created_at: string | null;
  status: string | null;
  title: string | null;
  artist: string | null;
  artist_name: string | null;
  submitter_name: string | null;
  year: number | string | null;
  city: string | null;
  event_id: number; // non-null because we filter for assigned
};

type EventRow = {
  id: number;
  slug: string;
  city: string | null;
  title: string | null;
  start_at: string | null; // ISO
};

export default async function ArchivePage() {
  // Use service role on the server so reads are reliable
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const sb = createClient(url, srv, { auth: { persistSession: false } });

  // 1) Approved + assigned only; newest → oldest
  const { data: subs, error: subErr } = await sb
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .not("event_id", "is", null)
    .order("created_at", { ascending: false });

  if (subErr) {
    return (
      <section style={{ padding: "2rem", maxWidth: 900 }}>
        <h1>Archive</h1>
        <p style={{ color: "crimson", marginTop: 12 }}>{subErr.message}</p>
      </section>
    );
  }

  const rows = (subs || []) as Submission[];
  if (rows.length === 0) {
    return (
      <section style={{ padding: "2rem", maxWidth: 900 }}>
        <h1>Archive</h1>
        <p style={{ marginTop: 12 }}>No approved, assigned items yet.</p>
      </section>
    );
  }

  // 2) Load only referenced events; newest events first
  const eventIds = Array.from(new Set(rows.map((r) => r.event_id)));
  const { data: evs, error: evErr } = await sb
    .from("events")
    .select("id, slug, city, title, start_at")
    .in("id", eventIds)
    .order("start_at", { ascending: true });

  if (evErr) {
    return (
      <section style={{ padding: "2rem", maxWidth: 900 }}>
        <h1>Archive</h1>
        <p style={{ color: "crimson", marginTop: 12 }}>{evErr.message}</p>
      </section>
    );
  }

  const events: EventRow[] = evs || [];
  const eventsById = new Map(events.map((e) => [e.id, e]));

  // 3) Group submissions by event_id (items newest → oldest inside each group)
  const byEvent = new Map<number, Submission[]>();
  for (const s of rows) {
    const list = byEvent.get(s.event_id) || [];
    list.push(s);
    byEvent.set(s.event_id, list);
  }
   for (const list of byEvent.values()) {
    list.sort((a, b) => {
      return (a.sort_index ?? 0) - (b.sort_index ?? 0);
    });
  }

  }

  // 4) Build sections using events order; include any unknown event_id as fallback
  const sections =
    events
      .map((ev) => {
        const items = byEvent.get(ev.id) || [];
        if (items.length === 0) return null;
        const header = [ev.city, ev.title || "Untitled"].filter(Boolean).join(" · ");
        return { key: `ev-${ev.id}`, header, slug: ev.slug, items };
      })
      .filter(Boolean) as Array<{
      key: string;
      header: string;
      slug?: string;
      items: Submission[];
    }>;

  for (const [eventId, items] of byEvent) {
    if (!eventsById.has(eventId)) {
      sections.push({ key: `ev-${eventId}`, header: `Event #${eventId}`, items });
    }
  }

  if (sections.length === 0) {
    return (
      <section style={{ padding: "2rem", maxWidth: 900 }}>
        <h1>Archive</h1>
        <p style={{ marginTop: 12 }}>No approved, assigned items yet.</p>
      </section>
    );
  }

  return (
    <section style={{ padding: "2rem", maxWidth: 900 }}>
      <h1>Archive</h1>

      {sections.map((sec) => (
        <div key={sec.key} style={{ marginTop: 28 }}>
          <h2 style={{ margin: "0 0 4px 0" }}>{sec.header}</h2>
          {sec.slug && (
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              <a
                href={`/events/${encodeURIComponent(sec.slug)}/screen`}
                target="_blank"
                rel="noreferrer"
              >
                Screen event page ↗
              </a>
            </div>
          )}
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 10,
            }}
          >
            {sec.items.map((r) => {
              const artist = r.artist || r.artist_name || r.submitter_name || "Unknown artist";
              const title = r.title || "Untitled";
              const year =
                typeof r.year === "number" || typeof r.year === "string"
                  ? String(r.year)
                  : r.created_at
                  ? new Date(r.created_at).getFullYear().toString()
                  : "";
              const city = r.city || "";
              const meta = [year ? `(${year})` : "", city ? `· ${city}` : ""]
                .join(" ")
                .trim();

              return (
                <li
                  key={r.id}
                  style={{
                    border: "1px solid #343434",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div>
                    <strong>{artist}</strong> — {title} {meta && <span>{meta}</span>}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
