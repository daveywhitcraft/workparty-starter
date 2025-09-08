export const runtime = "nodejs";

import { createClient } from "@supabase/supabase-js";
import Player from "./Player";

type EventRow = { id: number; slug: string; title?: string | null; city?: string | null };
type Submission = {
  id: string;
  created_at: string;
  title?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
  event_id?: number | null;
};

type PageProps = { params: { slug: string } };

function guessType(path: string) {
  const i = path.lastIndexOf(".");
  const ext = i >= 0 ? path.slice(i + 1).toLowerCase() : "";
  return ["mp4", "m4v", "mov", "webm", "mkv", "avi"].includes(ext) ? "video" : "file";
}

export default async function ScreenPage({ params }: PageProps) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, srv || anon, { auth: { persistSession: false } });

  // Find the event by slug
  const { data: evData, error: evErr } = await sb
    .from("events")
    .select("id, slug, title, city")
    .eq("slug", params.slug)
    .maybeSingle();

  if (evErr || !evData) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        Event not found for slug: <strong>{params.slug}</strong>
      </div>
    );
  }

  // Fetch all Approved submissions assigned to this event (oldest first)
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

  // Prepare to sign URLs
  const { data: bucketList } = await sb.storage.listBuckets();
  const bucketNames = new Set((bucketList || []).map((b) => b.name));

  const playlist = await Promise.all(
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
        src: fileUrl,
        type: s.file_path ? guessType(s.file_path) : "file",
      };
    })
  );

  const filtered = playlist.filter((p) => p.src && p.type === "video");
  if (!filtered.length) {
    return (
      <div style={{ padding: 24, color: "white", background: "black" }}>
        No playable videos found for this event.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <Player playlist={filtered} />
    </div>
  );
}
