'use client';
import { useState } from 'react';

const MAX_SIZE_MB = 1500; // ~1.5 GB hard cap
const ALLOWED_MIME = ['video/mp4']; // MP4 only for reliable web playback

type Stage = 'idle' | 'signing' | 'uploading' | 'confirming' | 'done' | 'error';

// accept several possible response shapes from /api/signed-upload
function pickSigned(resp: any) {
  if (!resp || typeof resp !== 'object') return null;
  if (resp.url && resp.path) return { url: resp.url, path: resp.path };
  if (resp.signedUrl && resp.path) return { url: resp.signedUrl, path: resp.path };
  if (resp.uploadUrl && resp.objectPath) return { url: resp.uploadUrl, path: resp.objectPath };
  if (resp.data) {
    const d = resp.data;
    if (d.url && d.path) return { url: d.url, path: d.path };
    if (d.signedUrl && d.path) return { url: d.signedUrl, path: d.path };
    if (d.uploadUrl && d.objectPath) return { url: d.uploadUrl, path: d.objectPath };
  }
  return null;
}

export default function SubmitPage() {
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [city, setCity] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setMessage('');
    setFile(null);
    if (!f) return;

    if (!ALLOWED_MIME.includes(f.type)) {
      setMessage('Use MP4 only. H.264 video + AAC audio recommended.');
      return;
    }
    const sizeMB = Math.round(f.size / (1024 * 1024));
    if (sizeMB > MAX_SIZE_MB) {
      setMessage(`File too large. Max ${MAX_SIZE_MB} MB (~1.5 GB).`);
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    if (!title || !artistName || !city || !year) {
      setMessage('Fill in title, artist, city, and year.');
      return;
    }
    if (!file) {
      setMessage('Choose a valid MP4 file first.');
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
      const signJson = await signResp.json().catch(() => ({} as any));
      if (!signResp.ok) throw new Error('Could not get upload URL');

      const picked = pickSigned(signJson);
      if (!picked?.url || !picked?.path) throw new Error('Signed URL missing');

      setStage('uploading');
      const putResp = await fetch(picked.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putResp.ok) throw new Error('Upload failed');

      setStage('confirming');
      const confirmResp = await fetch('/api/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist_name: artistName,
          city,
          year: Number(year),
          file_path: picked.path,
        }),
      });
      if (!confirmResp.ok) throw new Error('Save failed');

      setStage('done');
      setMessage('Submitted. Thank you.');

      setTitle('');
      setArtistName('');
      setCity('');
      setYear('');
      (document.getElementById('file-input') as HTMLInputElement).value = '';
      setFile(null);
    } catch (err: any) {
      setStage('error');
      setMessage(err?.message || 'Submission problem.');
    }
  }

  return (
    <section className="p-6 max-w-2xl">
      <h1 className="title mb-4">Submit your video</h1>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <b>Rules</b>
        <ul style={{ marginTop: 8, lineHeight: 1.5 }}>
          <li>Allowed type: <b>MP4</b></li>
          <li>Maximum size: <b>{MAX_SIZE_MB} MB</b> (~1.5 GB)</li>
          <li>Suggested codec: <b>H.264</b> video and <b>AAC</b> audio</li>
        </ul>
      </div>

      <form onSubmit={onSubmit} className="flex-col" style={{ gap: 12 }}>
        <label className="muted">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="muted">Artist name</label>
        <input value={artistName} onChange={(e) => setArtistName(e.target.value)} />

        <label className="muted">City</label>
        <input value={city} onChange={(e) => setCity(e.target.value)} />

        <label className="muted">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
        />

        <label className="muted">Video file</label>
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
          {stage === 'signing' ? 'Preparing…' :
           stage === 'uploading' ? 'Uploading…' :
           stage === 'confirming' ? 'Saving…' : 'Submit'}
        </button>
      </form>

      {message ? <p className="muted" style={{ marginTop: 12 }}>{message}</p> : null}
    </section>
  );
}
