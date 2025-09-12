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
  start_at: string | null; // ISO UTC date/time
};

type PageProps = { params: { slug: string } };

function guessType(path: string) {
  const i = path.lastIndexOf(".");
  const ext = i >= 0 ? path.slice(i + 1).toLowerCase() : "";
  return ["mp4", "m4v", "mov", "webm", "mkv", "avi"].includes(ext) ? "video" : "file";
}

// Get midnight-UTC date key: "YYYY-MM-DD"
function ymdUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

// Convert "YYYY-MM-DD" to UTC day number for diff math
function dayNumber(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const ms = Date.UTC(y, (m || 1) - 1, d || 1);
  return Math.floor(ms / 86400000);
}

export default async function ScreenPage({ params }: PageProps) {
  const authed = cookies().get("wp_admin_auth")?.value === "1";

  // Server actions: login sets same cookie as /admin; logout clears it
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

  // Supabase anon client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, anon, { auth: { persistSession: false } });

  // Load event (need start_at for date gating)
  const { data: evData, error: evErr } = await sb
    .from("events")
    .select("id, slug, title, city, start_at")
    .eq("slug", params.slug)
    .maybeSingle<EventRow>();

  if (evErr || !evData) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        Event not found for slug: <strong>{params.slug}</strong>
      </div>
    );
  }

  // Public window: event day ±1 (UTC)
  const todayKey = ymdUTC(new Date()); // "YYYY-MM-DD" in UTC
  const eventKey = evData.start_at ? new Date(evData.start_at).toISOString().slice(0, 10) : "";
  const publicAllowed =
    !!eventKey &&
    Math.abs(dayNumber(todayKey) - dayNumber(eventKey)) <= 1;

  if (!authed && !publicAllowed) {
    return (
      <div style={{ padding: 24, maxWidth: 520, color: "white", background: "black" }}>
        <h1 style={{ margin: 0 }}>Screening Locked</h1>
        <p style={{ marginTop: 8 }}>
          This screening is public on <strong>{eventKey || "TBA"}</strong>, plus the day before and after (UTC).
        </p>
        <p style={{ marginTop: 8, opacity: 0.85, fontSize: 14 }}>
          Admin may unlock with the password.
        </p>
        <form action={login} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            name="password"
            type="password"
            placeholder="Admin password"
            style={{ padding: 10, flex: 1 }}
            required
          />
          <button type="submit" style={{ padding: "10px 12px" }}>
            Unlock
          </button>
        </form>
      </div>
    );
  }

  // Fetch approved submissions for this event (oldest first for screening order)
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
  if (!rows.length) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        No approved videos for this event yet.
      </div>
    );
  }

  // Prepare signed URLs for the Player
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
    .filter(
      (p): p is { id: string; title: string; src: string; type: string } =>
        !!p.src && p.type === "video"
    )
    .map((p) => ({ id: p.id, title: p.title, src: p.src }));

  if (!playlist.length) {
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
