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

  // server actions
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const sb = createClient(url, srv, { auth: { persistSession: false } });

  // Robust slug lookup
  const rawSlug = decodeURIComponent(params.slug);
  const normalized = rawSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");

  let { data: evData } = await sb
    .from("events")
    .select("id, slug, title, city, start_at")
    .eq("slug", rawSlug)
    .maybeSingle<EventRow>();

  if (!evData) {
    const { data } = await sb
      .from("events")
      .select("id, slug, title, city, start_at")
      .eq("slug", normalized)
      .maybeSingle<EventRow>();
    evData = data || null;
  }

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
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        <h1>Event not found</h1>
        <p>Slug requested: <strong>{rawSlug}</strong></p>
      </div>
    );
  }

  // Lock for non-admins
  if (!authed) {
    return (
      <div style={{ padding: 24, maxWidth: 520, color: "white", background: "black" }}>
        <h1 style={{ margin: 0 }}>Screening Locked</h1>
        <p style={{ marginTop: 8 }}>Only admins may unlock with the password.</p>
        <form action={login} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input name="password" type="password" placeholder="Admin password" style={{ padding: 10, flex: 1 }} required />
          <button type="submit" style={{ padding: "10px 12px" }}>Unlock</button>
        </form>
      </div>
    );
  }

  // Fetch only approved submissions
  const { data: subs, error: subErr } = await sb
    .from("submissions")
    .select("id, title, file_path, storage_bucket, status, created_at")
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

  // Prepare signed URLs with key normalization
  const { data: bucketList } = await sb.storage.listBuckets();
  const bucketNames = new Set((bucketList || []).map((b) => b.name));

  const playlistRaw = await Promise.all(
    rows.map(async (s) => {
      const possible = [s.storage_bucket || "", "videos", "submissions", "public"].filter(Boolean) as string[];
      let bucket = possible.find((n) => bucketNames.has(n)) || "";
      if (!bucket && bucketList?.length) bucket = bucketList[0].name;

      let fileUrl: string | null = null;
      let reason: string | null = null;
      let key = s.file_path || "";

      if (!key) {
        reason = "missing file_path";
      } else if (!bucket) {
        reason = "no bucket match";
      } else {
        const pref = `${bucket}/`;
        if (key.startsWith(pref)) key = key.slice(pref.length);
        key = key.replace(/^\/+/, "");

        const { data: signed, error } = await sb.storage.from(bucket).createSignedUrl(key, 60 * 60 * 12);
        if (error) {
          reason = `sign error: ${error.message}`;
        } else {
          fileUrl = signed?.signedUrl || null;
          if (!fileUrl) reason = "no signed url";
        }
      }

      const type = s.file_path ? guessType(s.file_path) : "file";
      if (type !== "video" && !reason) reason = `type ${type}`;

      return {
        id: s.id,
        title: s.title || s.file_path || s.id,
        src: fileUrl,
        type,
        reason,
        meta: { status: s.status, bucket, file_path: s.file_path || "", key },
      };
    })
  );

  const playable = playlistRaw.filter(p => p.src && p.type === "video");
  const skipped = playlistRaw.filter(p => !p.src || p.type !== "video");

  if (playable.length === 0) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        No playable videos found for this event.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {authed && (
        <div style={{ position: "fixed", top: 8, right: 8, zIndex: 10, display: "flex", gap: 8 }}>
          <form action={logout}>
            <button type="submit" style={{ fontSize: 12, padding: "6px 10px" }}>
              Log out
            </button>
          </form>

          {skipped.length > 0 && (
            <details style={{ fontSize: 12 }}>
              <summary style={{ cursor: "pointer" }}>
                Skipped {skipped.length} / {playlistRaw.length}
              </summary>
              <div style={{ maxWidth: 420, maxHeight: 240, overflow: "auto", padding: 8, background: "#111", border: "1px solid #333", borderRadius: 6 }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {skipped.map(s => (
                    <li key={s.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 600 }}>{s.title}</div>
                      <div>Status: {s.meta.status || "?"}</div>
                      <div>Reason: {s.reason || "unknown"}</div>
                      <div>Bucket: {s.meta.bucket || "?"}</div>
                      <div>Path: {s.meta.file_path}</div>
                      <div>Key used: {s.meta.key}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      )}

      <Player
        playlist={playable.map(p => ({ id: p.id, title: p.title, src: p.src as string }))}
      />
    </div>
  );
}

