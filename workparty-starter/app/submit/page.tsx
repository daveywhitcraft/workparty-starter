'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB in bytes
const MAX_SIZE_LABEL = "3 GB";
const ALLOWED_MIME = ['video/mp4']; // MP4 only

type Stage = 'idle' | 'signing' | 'uploading' | 'confirming' | 'done' | 'error';

type EventRow = {
  id: number;
  slug: string;
  title: string | null;
  city: string | null;
  call_open_at: string | null;
  call_close_at: string | null;
};

export default function SubmitPage() {
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [city, setCity] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [runtime, setRuntime] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventId, setEventId] = useState<number | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(url, anon, { auth: { persistSession: false } });
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setEventsLoading(true);
        const nowIso = new Date().toISOString();
        const { data } = await supabase
          .from('events')
          .select('id, slug, title, city, call_open_at, call_close_at')
          .lte('call_open_at', nowIso)
          .gte('call_close_at', nowIso)
          .order('call_close_at', { ascending: true });
        const rows = (data as EventRow[]) || [];
        if (!live) return;
        setEvents(rows);
        if (rows.length === 1) setEventId(rows[0].id);
      } finally {
        if (live) setEventsLoading(false);
      }
    })();
    return () => { live = false; };
  }, [supabase]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setMessage('');
    setFile(null);
    if (!f) return;

    if (!ALLOWED_MIME.includes(f.type)) {
      setMessage('Only MP4 files are accepted.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setMessage(`File too large. Max ${MAX_SIZE_LABEL}.`);
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    if (events.length > 1 && !eventId) {
      setMessage('Please choose which event you are submitting to.');
      return;
    }

    if (!title || !artistName || !city || !year || !runtime || !file) {
      setMessage('Please fill all fields and choose a valid file.');
      return;
    }

    try {
      setStage('signing');
      const signResp = await fetch('/api/signed-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      const signJson = await signResp.json();
      if (!signResp.ok || !signJson.uploadUrl || !signJson.path) {
        setStage('error');
        setMessage(signJson?.error || 'Could not get upload URL');
        return;
      }

      setStage('uploading');
      const putResp = await fetch(signJson.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putResp.ok) {
        setStage('error');
        setMessage('Upload failed');
        return;
      }

      setStage('confirming');
      const confirmResp = await fetch('/api/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist_name: artistName,
          city,
          year: Number(year),
          runtime,
          file_path: signJson.path,
          event_id: eventId ?? undefined,
        }),
      });

      if (!confirmResp.ok) {
        setStage('error');
        setMessage('Save failed');
        return;
      }

      setStage('done');
      setMessage('Submitted. Thank you.');
      setTitle('');
      setArtistName('');
      setCity('');
      setYear('');
      setRuntime('');
      (document.getElementById('file-input') as HTMLInputElement).value = '';
      setFile(null);
    } catch {
      setStage('error');
      setMessage('Submission problem.');
    }
  }

  return (
    <section className="p-6 max-w-xl">
      <h1 className="title mb-4">Submit your video</h1>

      {eventsLoading ? null : events.length > 1 ? (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <label>
            <b>Choose event *</b>
          </label>
          <select
            value={eventId ?? ''}
            onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)}
            style={{ display: 'block', marginTop: 8 }}
            required
          >
            <option value="" disabled>Select an event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {(ev.title || ev.slug) + (ev.city ? ` — ${ev.city}` : '')}
              </option>
            ))}
          </select>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            (If only one call is open, it’s auto-selected.)
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex-col" style={{ gap: 12 }}>
        <label>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>Artist name *</label>
        <input value={artistName} onChange={(e) => setArtistName(e.target.value)} />

        <label>City *</label>
        <input value={city} onChange={(e) => setCity(e.target.value)} />

        <label>Year *</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
        />

        <label>Runtime *</label>
        <input value={runtime} onChange={(e) => setRuntime(e.target.value)} />

        <label>Video file (MP4, max {MAX_SIZE_LABEL}) *</label>
        <input
          id="file-input"
          type="file"
          accept=".mp4,video/mp4"
          onChange={onFileChange}
        />

        <button
          className="btn"
          type="submit"
          disabled={stage === 'signing' || stage === 'uploading' || stage === 'confirming'}
        >
          {stage === 'signing' ? 'Preparing…'
           : stage === 'uploading' ? 'Uploading…'
           : stage === 'confirming' ? 'Saving…'
           : 'Submit'}
        </button>
      </form>

      {message ? <p className="muted" style={{ marginTop: 12 }}>{message}</p> : null}
    </section>
  );
}
