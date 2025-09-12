export const runtime = "nodejs";
export const revalidate = 0; // always fresh

import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  created_at?: string | null;
  status?: string | null;
  title?: string | null;
  artist?: string | null;
  artist_name?: string | null;
  submitter_name?: string | null;
  year?: number | string | null;
  city?: string | null;
};

export default async function ArchivePage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, srv || anon, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .in("status", ["approved", "archived"])
    .order("created_at", { ascending: false });

  const rows: Row[] = (data as Row[]) || [];

  return (
    <section style={{ padding: "2rem", maxWidth: 900 }}>
      <h1>Archive Index</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        
      </p>

      {error ? (
        <p style={{ color: "crimson", marginTop: 12 }}>Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p style={{ marginTop: 12 }}>No archived items yet.</p>
      ) : (
        <ul style={{ marginTop: 16, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const artist =
              r.artist ||
              r.artist_name ||
              r.submitter_name ||
              "Unknown artist";
            const title = r.title || "Untitled";
            const year =
              typeof r.year === "number" || typeof r.year === "string"
                ? String(r.year)
                : r.created_at
                ? new Date(r.created_at).getFullYear().toString()
                : "";
            const city = r.city || "";
            const meta =
              [year ? `(${year})` : "", city ? `· ${city}` : ""]
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
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    {r.status}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
