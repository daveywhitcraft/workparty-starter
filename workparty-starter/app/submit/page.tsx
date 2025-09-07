'use client';
import { useState } from 'react';

const MAX_SIZE_MB = 250; // 250 MB
const ALLOWED_MIME = ['video/mp4']; // MP4 only

type Stage = 'idle' | 'signing' | 'uploading' | 'confirming' | 'done' | 'error';

function pickSigned(resp: any) {
  if (resp?.url && resp?.path) return { url: resp.url, path: resp.path };
  if (resp?.signedUrl && resp?.path) return { url: resp.signedUrl, path: resp.path };
  if (resp?.uploadUrl && resp?.objectPath) return { url: resp.uploadUrl, path: resp.objectPath };
  if (resp?.data) {
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
          runtime,
          file_path: picked.path,
        }),
      });
      if (!confirmResp.ok) throw new Error('Save failed');
