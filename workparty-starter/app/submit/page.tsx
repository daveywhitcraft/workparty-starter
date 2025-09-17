// app/submit/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export default function SubmitPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function parseMmSs(mmss: string) {
    const m = mmss.match(/^(\d{1,3}):([0-5]\d)$/);
    if (!m) return null;
    const minutes = parseInt(m[1], 10);
    const seconds = parseInt(m[2], 10);
    const totalSeconds = minutes * 60 + seconds;
    const runtimeMinutesRounded = minutes + (seconds >= 30 ? 1 : 0); // for legacy "minutes" field
    return {
      mmss,
      totalSeconds,
      minutesRounded: runtimeMinutesRounded,
      minutesExact: +(totalSeconds / 60).toFixed(2),
    };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);

    try {
      const formEl = e.currentTarget;
      const data = new FormData(formEl);

      const title = String(data.get('title') || '');
      const artist_name = String(data.get('artist_name') || '');
      const city = String(data.get('city') || '');
      const year = Number(data.get('year') || 0);
      const runtimeStr = String(data.get('runtime') || '');
      const file = data.get('file') as File | null;

      const parsed = parseMmSs(runtimeStr);
      if (!title || !artist_name || !city || !year || !runtimeStr || !file || !parsed) {
        setMsg('Please fill every field. Runtime must look like 13:40.');
        setBusy(false);
        return;
      }

      // Storage path
      const safeName = file.name.replace(/\s+/g, '_');
      const path = `submissions/${Date.now()}_${safeName}`;

      // Upload to Supabase Storage
      const { error: upErr } = await supabase
        .storage
        .from('videos')
        .upload(path, file, {
          contentType: file.type || 'video/mp4',
          upsert: false,
        });

      if (upErr) {
        setMsg(`Upload error: ${upErr.message}`);
        setBusy(false);
        return;
      }

      // Save DB row through your existing API
      const resp = await fetch('/api/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist_name,
          city,
          year,
          // keep the original "runtime" numeric minutes field for compatibility
          runtime: parsed.minutesRounded,
          // send richer values too, in case the API wants them
          runtime_seconds: parsed.totalSeconds,
          runtime_mmss: parsed.mmss,
          runtime_minutes_exact: parsed.minutesExact,
          storage_bucket: 'videos',
          file_path: path,
          status: 'pending',
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        setMsg(`confirm-upload: ${resp.status} ${txt}`);
        setBusy(false);
        return;
      }

      setMsg('Submitted. Thank you!');
      formEl.reset();
    } catch (err: any) {
      setMsg(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-6 pt-28 pb-20">
      <h1 className="text-3xl font-semibold mb-8">Submit your video</h1>

      <form
        className="max-w-2xl space-y-5"
        action="/api/submit"
        method="post"
        encType="multipart/form-data"
        onSubmit={onSubmit}
      >
        <div>
          <label htmlFor="title" className="block mb-1">Title *</label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="Title"
          />
        </div>

        <div>
          <label htmlFor="artist_name" className="block mb-1">Artist name *</label>
          <input
            id="artist_name"
            name="artist_name"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="city" className="block mb-1">City *</label>
          <input
            id="city"
            name="city"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="City"
          />
        </div>

        <div>
          <label htmlFor="year" className="block mb-1">Year *</label>
          <input
            id="year"
            name="year"
            type="number"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="2025"
          />
        </div>

        <div>
          <label htmlFor="runtime" className="block mb-1">Runtime (mm:ss) *</label>
          <input
            id="runtime"
            name="runtime"
            inputMode="numeric"
            pattern="^\d{1,3}:[0-5]\d$"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            placeholder="13:40"
            title="Use mm:ss, for example 07:30 or 13:40"
          />
        </div>

        <div>
          <label htmlFor="file" className="block mb-1">Video file (MP4, max 3 GB) *</label>
          <input
            id="file"
            name="file"
            type="file"
            accept="video/mp4"
            required
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="rounded border border-white/30 px-4 py-2 hover:bg-white/10"
          disabled={busy}
        >
          Submit
        </button>

        {msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
      </form>
    </main>
  );
}
