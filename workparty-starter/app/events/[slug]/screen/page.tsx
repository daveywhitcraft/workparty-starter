export const runtime = "nodejs";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Player from "./Player";

type Submission = {
  id: string;
  created_at: string;
  title?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
  event_id?: number | null;
};

type EventRow = {
  id: number;
  slug: string;
  title: string | null;
  city: string | null;
  start_at: string | null; // ISO
};

type PageProps = { params: { slug: string } };

function guessType(path: string) {
  const i = path.lastIndexOf(".");
  const ext = i >= 0 ? path.slice(i + 1).toLowerCase() : "";
  return ["mp4", "m4v", "mov", "webm", "mkv", "avi"].includes(ext) ? "video" : "file";
}

function ymdUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}
function dayNumber(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

export default async function ScreenPage({ params }: PageProps) {
  const authed = cookies().get("wp_admin_auth")?.value === "1";

  // server actions (same cookie/password as /admin)
  async function login(formData: FormData) {
    "use server";
    const pwd = String(formData.get("password") || "");
    if (pwd === process.env.ADMIN_PASS) {
      cookies().set("wp_admin_auth", "1", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    redirect(`/events/${encodeURIComponent(params.slug)}/screen`);
  }
  async function logout() {
    "use server";
    cookies().delete("wp_admin_auth");
    redirect(`/events/${encodeURIComponent(params.slug)}/screen`);
  }

  // Supabase (service role stays on server)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const sb = createClient(url, srv, { auth: { persistSession: false } });

  // Robust slug lookup
  const rawSlug = decodeURIComponent(params.slug);
  const normalized = rawSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");

  // 1) exact match
  let { data: evData } = await sb
    .from("events")
    .select("id, slug, title, city, start_at")
    .eq("slug", rawSlug)
    .maybeSingle<EventRow>();

  // 2) fallback exact on normalized
  if (!evData) {
    const { data } = await sb
      .from("events")
      .select("id, slug, title, city, start_at")
      .eq("slug", normalized)
      .maybeSingle<EventRow>();
    evData = data || null;
  }

  // 3) fallback relaxed `ilike` if still missing (prefix match)
  if (!evData) {
    const { data } = await sb
      .from("events")
      .select("id, slug, title, city, start_at")
      .ilike("slug", `${normalized}%`)
      .order("start_at", { ascending: false })
      .limit(1);
    evData = (data && data[0]) || null;
  }

  if (!evData) {
    // If admin, show quick list of available slugs to help click-through
    let hints: EventRow[] = [];
    if (authed) {
      const { data: all } = await sb
        .from("events")
        .select("id, slug, title, city, start_at")
        .order("start_at", { ascending: false })
        .limit(12);
      hints = all || [];
    }

    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        <h1 style={{ marginTop: 0 }}>Event not found</h1>
        <p>Slug requested: <strong>{rawSlug}</strong></p>
        {authed && hints.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
            <div style={{ marginBottom: 6 }}>Recent event slugs:</div>
            <ul>
              {hints.map((e) => (
                <li key={e.id}>
                  <a
                    style={{ color: "white", textDecoration: "underline" }}
                    href={`/events/${encodeURIComponent(e.slug)}/screen`}
                  >
                    {e.city ? `${e.city} · ` : ""}{e.title || "Untitled"} — {e.slug}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Public window: event day ±1 (UTC)
  const todayKey = ymdUTC(new Date());
  const eventKey = evData.start_at ? new Date(evData.start_at).toISOString().slice(0, 10) : "";
  const publicAllowed = !!eventKey && Math.abs(dayNumber(todayKey) - dayNumber(eventKey)) <= 1;

  if (!authed && !publicAllowed) {
    return (
      <div style={{ padding: 24, maxWidth: 520, color: "white", background: "black" }}>
        <h1 style={{ margin: 0 }}>Screening Locked</h1>
        <p style={{ marginTop: 8 }}>
          Public window: <strong>{eventKey || "TBA"}</strong> plus the day before and after (UTC).
        </p>
        <p style={{ marginTop: 8, opacity: 0.85, fontSize: 14 }}>
          Admin may unlock with the password.
        </p>
        <form action={login} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input name="password" type="password" placeholder="Admin password" style={{ padding: 10, flex: 1 }} required />
          <button type="submit" style={{ padding: "10px 12px" }}>Unlock</button>
        </form>
      </div>
    );
  }

  // Fetch approved submissions for this event (screening order = oldest → newest)
  const { data: subs, error: subErr } = await sb
    .from("submissions")
    .select("*")
    .eq("event_id", evData.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (subErr) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        Error loading submissions: {subErr.message}
      </div>
    );
  }

  const rows = (subs || []) as Submission[];
  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        No approved videos for this event yet.
      </div>
    );
  }

  // Prepare signed URLs
  const { data: bucketList } = await sb.storage.listBuckets();
  const bucketNames = new Set((bucketList || []).map((b) => b.name));

  const playlistRaw = await Promise.all(
    rows.map(async (s) => {
      const possible = [s.storage_bucket || "", "videos", "submissions", "public"].filter(Boolean) as string[];
      let bucket = possible.find((n) => bucketNames.has(n)) || "";
      if (!bucket && bucketList?.length) bucket = bucketList[0].name;

      let fileUrl: string | null = null;
      if (bucket && s.file_path) {
        const { data: signed } = await sb.storage.from(bucket).createSignedUrl(s.file_path, 60 * 60 * 12);
        fileUrl = signed?.signedUrl || null;
      }
      return {
        id: s.id,
        title: s.title || s.file_path || s.id,
        src: fileUrl as string | null,
        type: s.file_path ? guessType(s.file_path) : "file",
      };
    })
  );

  const playlist: { id: string; title: string; src: string }[] = playlistRaw
    .filter((p): p is { id: string; title: string; src: string; type: string } => !!p.src && p.type === "video")
    .map((p) => ({ id: p.id, title: p.title, src: p.src }));

  if (playlist.length === 0) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        No playable videos found for this event.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {authed && (
        <div style={{ position: "fixed", top: 8, right: 8, zIndex: 10 }}>
          <form action={logout}>
            <button type="submit" style={{ fontSize: 12, padding: "6px 10px" }}>
              Log out
            </button>
          </form>
        </div>
      )}
      <Player playlist={playlist} />
    </div>
  );
}
