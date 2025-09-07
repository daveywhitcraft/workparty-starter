'use client';
import { useState } from 'react';

const MAX_SIZE_MB = 2000; // 2 GB
const ALLOWED_MIME = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'];

type Stage = 'idle' | 'signing' | 'uploading' | 'confirming' | 'done' | 'error';

export default function SubmitPage() {
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [city, setCity] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');

  function humanMB(bytes: number) {
    return Math.round(bytes / (1024 * 1024));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setMessage('');
    setFile(null);

    if (!f) return;

    if (!ALLOWED_MIME.includes(f.type)) {
      setMessage('Use MP4, MOV, M4V, or WEBM.');
      return;
    }
    const sizeMB = humanMB(f.size);
    if (sizeMB > MAX_SIZE_MB) {
      setMessage(`File too large. Max ${MAX_SIZE_MB} MB.`);
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
      setMessage('Choose a valid file first.');
      return;
    }

    try {
      // 1) Ask backend for a signed upload URL
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

      if (!signResp.ok) throw new Error('Could not get upload URL');
      const { url, path } = await signResp.json(); // expects { url, path }

      // 2) Upload file to the signed URL
      setStage('uploading');
      const putResp = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putResp.ok) throw new Error('Upload failed');

      // 3) Tell backend about the new submission
      setStage('confirming');
      const confirmResp = await fetch('/api/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist_name: artistName,
          city,
          year: Number(year),
          file_path: path, // this is what Admin uses to play the video
        }),
      });
      if (!confirmResp.ok) throw new Error('Confirm failed');

      setStage('done');
      setMessage('Submitted. Thank you.');
      // reset form
      setTitle('');
      setArtistName('');
      setCity('');
      setYear('');
      (document.getElementById('file-input') as HTMLInputElement)?.value && ((document.getElementById('file-input') as HTMLInputElement).value = '');
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
          <li>Allowed types: <b>MP4</b>, <b>MOV</b>, <b>M4V</b>, <b>WEBM</b></li>
          <li>Maximum size: <b>{MAX_SIZE_MB} MB</b> (about 2 GB)</li>
          <li>Best playback: <b>MP4</b> with <b>H.264</b> video and <b>AAC</b> audio</li>
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
          accept=".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/x-m4v,video/webm"
          onChange={onFileChange}
        />

        <button className="btn" type="submit" disabled={stage === 'signing' || stage === 'uploading' || stage === 'confirming'}>
          {stage === 'signing' ? 'Preparing…' : stage === 'uploading' ? 'Uploading…' : stage === 'confirming' ? 'Saving…' : 'Submit'}
        </button>
      </form>

      {message ? <p className="muted" style={{ marginTop: 12 }}>{message}</p> : null}
    </section>
  );
}
