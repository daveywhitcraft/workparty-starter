'use client';
import { useState } from 'react';

const MAX_SIZE_MB = 250; // 250 MB
const ALLOWED_MIME = ['video/mp4']; // MP4 only

type Stage = 'idle' | 'signing' | 'uploading' | 'confirming' | 'done' | 'error';

export default function SubmitPage() {
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [city, setCity] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [runtime, setRuntime] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setMessage('');
    setFile(null);
    if (!f) return;

    if (!ALLOWED_MIME.includes(f.type)) {
      setMessage('Only MP4 files are accepted.');
      return;
    }
    const sizeMB = Math.round(f.size / (1024 * 1024));
    if (sizeMB > MAX_SIZE_MB) {
      setMessage(`File too large. Max ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    if (!title || !artistName || !city || !year || !runtime || !file) {
      setMessage('Please fill all fields and choose a valid file.');
      return;
    }

    try {
      // 1) Ask backend for signed upload URL
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

      // 2) Upload file with PUT directly
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

      // 3) Save metadata
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

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <b>Rules</b>
        <ul style={{ marginTop: 8, lineHeight: 1.5 }}>
          <li>Allowed type: <b>MP4</b></li>
          <li>Maximum size: <b>{MAX_SIZE_MB} MB</b></li>
        </ul>
      </div>

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

        <label>Video file (MP4, max {MAX_SIZE_MB} MB) *</label>
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
