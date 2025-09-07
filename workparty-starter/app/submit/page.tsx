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
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');

  // Metadata fields
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [email, setEmail] = useState('');
  const [runtime, setRuntime] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [instagram, setInstagram] = useState('');
  const [agree, setAgree] = useState(false);

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
      setMessage(`
