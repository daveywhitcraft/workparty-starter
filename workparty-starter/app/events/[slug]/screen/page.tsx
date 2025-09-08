export const runtime = "nodejs";
export const revalidate = 0; // always fresh

import { createClient } from "@supabase/supabase-js";

// ---------- Server types ----------
type EventRow = { id: number; slug: string; title?: string | null; city?: string | null };
type Submission = {
  id: string;
  title?: string | null;
  description?: string | null;
  file_path?: string | null;
  storage_bucket?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default async function ScreenPage({ params }: { params: { slug: string } }) {
  // Use service role on the server to reliably create signed URLs (works with private buckets too).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srv = process.env.SUPABASE_SERVICE_ROLE || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const sb = createClient(url, srv || anon, { auth: { persistSession: false } });

  // 1) Find the event by slug
  const { data: evs, error: evErr } = await sb
    .from("events")
    .select("*")
    .eq("slug", params.slug)
    .limit(1);

  if (evErr || !evs?.length) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Screening</h1>
        <p style={{ color: "crimson" }}>Event not found: “{params.slug}”.</p>
      </main>
    );
  }
  const event = evs[0] as EventRow;

  // 2) Get approved (or archived) submissions for this event (newest first).
  const { data: subs, error: subErr } = await sb
    .from("submissions")
    .select("*")
    .eq("event_id", event.id)
    .in("status", ["approved", "archived"])
    .order("created_at", { ascending: false });

  if (subErr) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Screening</h1>
        <p style={{ color: "crimson" }}>Error loading program: {subErr.message}</p>
      </main>
    );
  }

  const rows = (subs as Submission[]) || [];

  // 3) Build signed URLs that work for any file. Prefer the row's bucket, fall back if needed.
  const { data: bucketList } = await sb.storage.listBuckets();
  const bucketNames = new Set((bucketList || []).map((b) => b.name));

  async function signed(bucket: string | null | undefined, path: string | null | undefined) {
    const candidates = [bucket || "", "videos", "submissions", "public"].filter(Boolean) as string[];
    let b = candidates.find((n) => bucketNames.has(n)) || "";
    if (!b && bucketList?.length) b = bucketList[0].name;
    if (!b || !path) return { url: null as string | null, err: "missing bucket or path", bucket: b };
    const { data, error } = await sb.storage.from(b).createSignedUrl(path, 60 * 60 * 12); // 12h
    return { url: data?.signedUrl || null, err: error?.message || null, bucket: b };
  }

  const playlist = await Promise.all(
    rows.map(async (r) => {
      const s = await signed(r.storage_bucket, r.file_path);
      return {
        id: r.id,
        title: r.title || r.file_path || r.id,
        description: r.description || "",
        url: s.url, // may be null if path is wrong
        bucket: s.bucket,
        err: s.err,
        created_at: r.created_at || null,
      };
    })
  );

  return (
    <main style={{ background: "black", color: "white", minHeight: "100vh" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>{event.city || ""}</div>
          <h1 style={{ margin: 0, fontSize: 18 }}>{event.title || params.slug}</h1>
        </div>
        <small style={{ opacity: 0.7 }}>{playlist.filter(p => p.url).length} items</small>
      </div>

      <Player items={playlist} />
    </main>
  );
}

// ========== Client player ==========
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: string; title: string; description: string; url: string | null; bucket?: string; err?: string | null };

function Player({ items }: { items: Item[] }) {
  const filtered = useMemo(() => items.filter((i) => !!i.url), [items]);
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showSlate, setShowSlate] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const cur = filtered[i];

  // Countdown slate before first play
  useEffect(() => {
    if (!showSlate) return;
    setCountdown(5);
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [showSlate]);

  useEffect(() => {
    if (!showSlate && vidRef.current) {
      const v = vidRef.current;
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  }, [showSlate]);

  // Prefetch next URL
  useEffect(() => {
    const next = filtered[i + 1];
    if (!next?.url) return;
    const l = document.createElement("link");
    l.rel = "prefetch";
    l.href = next.url;
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, [i, filtered]);

  function next() { if (i < filtered.length - 1) setI(i + 1); }
  function prev() { if (i > 0) setI(i - 1); }
  function toggleFull() {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }
  function onEnded() {
    if (loop) { vidRef.current?.play().catch(() => {}); return; }
    if (i < filtered.length - 1) setI(i + 1);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        if (!vidRef.current) return;
        if (vidRef.current.paused) vidRef.current.play().catch(() => {});
        else vidRef.current.pause();
      } else if (k === "arrowright" || k === "n") next();
      else if (k === "arrowleft" || k === "p") prev();
      else if (k === "f") toggleFull();
      else if (k === "m") setMuted((m) => !m);
      else if (k === "l") setLoop((x) => !x);
      else if (k === "s") setShowList((x) => !x);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, loop]);

  if (filtered.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        No playable items. Use Admin to check file paths or formats. “Open file” links will still work on the item pages.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Slate */}
      {showSlate && (
        <div
          style={{
            position: "fixed", inset: 0, background: "black", color: "white",
            display: "grid", placeItems: "center", zIndex: 20,
          }}
          onClick={() => setShowSlate(false)}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{countdown > 0 ? countdown : "Start"}</div>
            <div style={{ opacity: 0.8 }}>Space play/pause · F fullscreen · N next · P prev · M mute · L loop · S list</div>
          </div>
        </div>
      )}

      {/* Video */}
      <div style={{ display: "grid", placeItems: "center", padding: "8px 16px" }}>
        <video
          key={cur.id}
          ref={vidRef}
          src={cur.url ?? undefined}
          controls
          muted={muted}
          onEnded={onEnded}
          style={{ width: "100%", maxWidth: 1400, height: "auto", background: "black" }}
        />
      </div>

      {/* Overlay title */}
      <div
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          padding: "10px 12px",
          background: "rgba(0,0,0,0.5)",
          borderRadius: 6,
          maxWidth: "calc(100% - 32px)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>{cur.title}</div>
      </div>

      {/* Controls */}
      <div
        style={{
          position: "fixed", right: 16, bottom: 16, display: "flex", gap: 8, zIndex: 10,
        }}
      >
        <Btn onClick={prev} label="Prev" />
        <Btn onClick={next} label="Next" />
        <Btn onClick={() => setMuted((m) => !m)} label={muted ? "Unmute" : "Mute"} />
        <Btn onClick={() => setLoop((x) => !x)} label={loop ? "Loop ✓" : "Loop"} />
        <Btn onClick={toggleFull} label="Full" />
        <Btn onClick={() => setShowList((x) => !x)} label={showList ? "Hide list" : "Show list"} />
      </div>

      {/* Playlist */}
      {showList && (
        <div
          style={{
            position: "fixed",
            right: 16,
            top: 64,
            width: 360,
            maxHeight: "65vh",
            overflow: "auto",
            background: "rgba(0,0,0,0.7)",
            padding: 12,
            borderRadius: 8,
            zIndex: 15,
          }}
        >
          <ol style={{ margin: 0, paddingLeft: 16 }}>
            {filtered.map((it, idx) => (
              <li key={it.id} style={{ marginBottom: 8, cursor: "pointer", opacity: idx === i ? 1 : 0.8 }}>
                <a onClick={() => setI(idx)} style={{ color: "white", textDecoration: idx === i ? "underline" : "none" }}>
                  {it.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Btn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        fontSize: 14,
        background: "rgba(255,255,255,0.1)",
        color: "white",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 6,
      }}
    >
      {label}
    </button>
  );
}
