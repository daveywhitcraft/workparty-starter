"use client";

import { useState } from "react";

type Item = { path: string; signedUrl: string };

export default function AdminPage() {
  const [videos, setVideos] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadVideos() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/admin/videos", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVideos(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>

      <button
        onClick={loadVideos}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Loading…" : "Load Videos"}
      </button>

      {err && <p className="mt-3 text-red-600">Error: {err}</p>}

      {!loading && !err && videos.length === 0 && (
        <p className="mt-4 text-sm text-neutral-600">No videos yet.</p>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-6">
        {videos.map((v) => (
          <li key={v.path} className="border rounded p-4">
            <p className="text-xs mb-2 break-all">{v.path}</p>
            <video
              src={v.signedUrl}
              controls
              className="w-full h-auto"
              preload="metadata"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
