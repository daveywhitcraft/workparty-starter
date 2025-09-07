'use client';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function SubmitPage() {
  const [status, setStatus] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('Preparing upload...');

    const form = new FormData(e.currentTarget);
    const meta = Object.fromEntries(form.entries());

    if (!file) { setStatus('Choose a video file'); return; }

    // Ask server for a signed upload URL and create a DB record
    const path = `${uuidv4()}/${file.name}`;
    const resp = await fetch('/api/signed-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, meta })
    });
    if (!resp.ok) { setStatus('Issue creating upload link'); return; }
    const data = await resp.json();

    setStatus('Uploading...');
    // Upload directly to Supabase using signed URL token
    const uploadResp = await fetch(data.signedUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${data.token}`, 'x-upsert': 'true', 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!uploadResp.ok) { setStatus('Upload failed'); return; }

    // Confirm upload to update status in DB
    await fetch('/api/confirm-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.rowId })
    });

    setStatus('Submitted. Thank you.');
    (e.target as HTMLFormElement).reset();
    setFile(null);
  }

  return (
    <section>
      <h1 className="title">Submit</h1>
      <p className="muted">Upload a single video with metadata. After review, items can appear in the Current Screening.</p>
      <form onSubmit={handleSubmit} className="grid">
        <input name="artist_name" placeholder="Artist name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="city" placeholder="City" />
        <input name="title" placeholder="Work title" required />
        <input name="year" placeholder="Year" />
        <input name="runtime" placeholder="Runtime (mm:ss)" />
        <input name="aspect_ratio" placeholder="Aspect ratio" />
        <input name="resolution" placeholder="Resolution" />
        <textarea name="synopsis" placeholder="Synopsis"></textarea>
        <textarea name="credits" placeholder="Credits"></textarea>
        <label className="row"><input type="checkbox" name="consent_archive" /> Consent for Archive listing</label>
        <label className="row">
          <span>Video file</span>
          <input type="file" accept="video/*" onChange={(e)=> setFile(e.target.files?.[0] ?? null)} required />
        </label>
        <button className="btn primary" type="submit">Send</button>
      </form>
      <p className="muted" style={{marginTop:12}}>{status}</p>
    </section>
  );
}
