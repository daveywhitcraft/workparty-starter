// app/submit/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

function parseMmSs(mmss: string) {
  const m = mmss.match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  const minutes = parseInt(m[1], 10);
  const seconds = parseInt(m[2], 10);
  const totalSeconds = minutes * 60 + seconds;
  const minutesRounded = minutes + (seconds >= 30 ? 1 : 0);
  return {
    mmss,
    totalSeconds,
    minutesRounded,
    minutesExact: +(totalSeconds / 60).toFixed(2),
  };
}

// strict slug (no accents, only a-z0-9._-)
function slugify(s: string) {
  let out = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  out = out.replace(/[^a-zA-Z0-9._-]+/g, '-');
  out = out.replace(/-+/g, '-').replace(/^[-_.]+|[-_.]+$/g, '');
  return out.toLowerCase();
}

// get extension from MIME, never from filename
function extFromMime(mime: string): 'mp4' | 'mov' {
  if (mime === 'video/quicktime') return 'mov';
  return 'mp4';
}

// build key without using the original filename
function buildKey(artist: string, title: string, mime: string) {
  const artistSlug = slugify(artist) || 'artist';
  const titleSlug = slugify(title) || 'video';
  const ts = Date.now();
  const ext = extFromMime(mime);
  // directory prefix inside the bucket
  return `submissions/${artistSlug}/${ts}_${titleSlug}.${ext}`;
}

export default function SubmitPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'upload' | 'save' | 'done' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setPhase('upload');
    setMsg('Uploading…');

    try {
      const formEl = e.currentTarget;
      const data = new FormData(formEl);

      const title = String(data.get('title') || '');
      const artist_name = String(data.get('artist_name') || '');
      const city = String(data.get('city') || '');
      const year = Number(data.get('year') || 0);
      const runtimeStr = String(data.get('runtime') || '');
      const email = String(data.get('email') || '').trim(); // NEW
      const file = data.get('file') as File | null;

      const parsed = parseMmSs(runtimeStr);
      if (!title || !artist_name || !city || !year || !runtimeStr || !file || !parsed) {
        setPhase('error');
        setMsg('Please fill every field. Runtime must look like 13:40.');
        setBusy(false);
        return;
      }

      // accept mp4 or mov by MIME or filename fallback
      const nameExt = file.name.split('.').pop()?.toLowerCase();
      const mime = file.type || (nameExt === 'mov' ? 'video/quicktime' : 'video/mp4');
      const okExt = mime === 'video/mp4' || mime === 'video/quicktime' || nameExt === 'mp4' || nameExt === 'mov';
      if (!okExt) {
        setPhase('error');
        setMsg('Use .mp4 or .mov with H.264 video.');
        setBusy(false);
        return;
      }

      const maxBytes = 3 * 1024 * 1024 * 1024; // 3 GB
      if (file.size > maxBytes) {
        setPhase('error');
        setMsg('File is over 3 GB.');
        setBusy(false);
        return;
      }

      // build a key that never includes the original filename
      const path = buildKey(artist_name, title, mime);

      const { error: upErr } = await supabase
        .storage
        .from('videos') // bucket name
        .upload(path, file, {
          contentType: mime,
          upsert: false,
        });

      if (upErr) {
        setPhase('error');
        setMsg(`Upload error: ${upErr.message}`);
        setBusy(false);
        return;
      }

      setPhase('save');
      setMsg('Saving…');

      const resp = await fetch('/api/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist_name,
          city,
          year,
          runtime: parsed.minutesRounded,
          storage_bucket: 'videos',
          file_path: path,
          email: email || null, // NEW
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        setPhase('error');
        setMsg(`confirm-upload: ${resp.status} ${txt}`);
        setBusy(false);
        return;
      }

      setPhase('done');
      setMsg('Submitted. Thank you!');
      formEl.reset();
    } catch (err: any) {
      setPhase('error');
      setMsg(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-6 pt-28 pb-20">
      <h1 className="text-3xl font-semibold mb-8">Submit your video</h1>

      <div className="max-w-2xl mb-6 rounded border border-white/15 bg-white/5 p-4 text-sm">
        <p className="font-medium mb-1">Upload requirements</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>.mp4 or .mov</li>
          <li>Video codec: H.264</li>
          <li>Max size: 3 GB</li>
        </ul>
      </div>

      <form className="max-w-2xl space-y-5" onSubmit={onSubmit}>
        <div>
          <label htmlFor="title" className="block mb-1">Title *</label>
          <input id="title" name="title" required className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="Title" disabled={busy} />
        </div>

        <div>
          <label htmlFor="artist_name" className="block mb-1">Artist name *</label>
          <input id="artist_name" name="artist_name" required className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="Your name" disabled={busy} />
        </div>

        <div>
          <label htmlFor="city" className="block mb-1">City *</label>
          <input id="city" name="city" required className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="City" disabled={busy} />
        </div>

        <div>
          <label htmlFor="year" className="block mb-1">Year *</label>
          <input id="year" name="year" type="number" required className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="2025" disabled={busy} />
        </div>

        <div>
          <label htmlFor="runtime" className="block mb-1">Runtime (mm:ss) *</label>
          <input id="runtime" name="runtime" inputMode="numeric" pattern="^\\d{1,3}:[0-5]\\d$" required className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="13:40" title="Use mm:ss, for example 07:30 or 13:40" disabled={busy} />
        </div>

        {/* NEW: Email (optional, admin-only visibility later) */}
        <div>
          <label htmlFor="email" className="block mb-1">Email (kept private)</label>
          <input id="email" name="email" type="email" className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" placeholder="you@example.com" disabled={busy} />
          <p className="mt-1 text-xs opacity-70">Only admins can see this. It won’t appear on the public pages.</p>
        </div>

        <div>
          <label htmlFor="file" className="block mb-1">Video file (.mp4 or .mov, max 3 GB) *</label>
          <input id="file" name="file" type="file" accept=".mp4,.mov,video/mp4,video/quicktime" required className="w-full rounded border border-white/20 bg-black/30 px-3 py-2" disabled={busy} />
        </div>

        <button type="submit" className="rounded border border-white/30 px-4 py-2 hover:bg-white/10 disabled:opacity-60" disabled={busy}>
          {busy ? (phase === 'upload' ? 'Uploading…' : 'Saving…') : 'Submit'}
        </button>

        {(phase === 'done' || phase === 'error') && msg && <p className="mt-3 text-sm opacity-80">{msg}</p>}
      </form>
    </main>
  );
}
