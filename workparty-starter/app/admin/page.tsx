'use client';
import { useState } from 'react';
import { Submission } from '@/types';

function guessMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'm4v') return 'video/x-m4v';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  return 'application/octet-stream';
}

export default function AdminPage() {
  const [pass, setPass] = useState('');
  const [rows, setRows] = useState<Submission[]>([]);
  const [status, setStatus] = useState('');
  const [authed, setAuthed] = useState(false);

  async function load() {
    const resp = await fetch('/api/list-all', { headers: { 'x-admin': pass } });
    if (!resp.ok) { setStatus('Could not load items'); return; }
    const json = await resp.json();
    setRows(Array.isArray(json.rows) ? json.rows : []);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Checking...');
    const resp = await fetch('/api/list-all', { headers: { 'x-admin': pass } });
    if (resp.ok) {
      setAuthed(true);
      setStatus('Access granted');
      const json = await resp.json();
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } else {
      setStatus('Wrong password');
    }
  }

  async function setRow(id: string, body: any) {
    setStatus('Saving...');
    const resp = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin': pass,
      },
      body: JSON.stringify({ id, ...body }),
    });
    if (!resp.ok) { setStatus('Save issue'); return; }
    setStatus('Saved');
    load();
  }

  return (
    <section>
      <h1 className="title">Admin</h1>

      {!authed ? (
        <form onSubmit={handleLogin} className="row" style={{ gap: 8 }}>
          <input
            type="password"
            placeholder="Admin pass"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button type="submit" className="btn">Submit</button>
        </form>
      ) : (
        <>
          <p className="muted" style={{ margin: '12px 0' }}>
            Showing active items. Archived items stay hidden.
          </p>

          <div className="grid">
            {rows
              .filter((r: any) => r.status !== 'archived')
              .map((r: any) => (
                <div className="card" key={r.id}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b>{r.title}</b><span className="muted">{r.artist_name}</span>
                  </div>
                  <p className="muted">{r.city} · {r.year}</p>

                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn" onClick={() => setRow(r.id, { status: 'approved' })}>Approve</button>
                    <button className="btn" onClick={() => setRow(r.id, { status: 'rejected' })}>Reject</button>
                    <button className="btn" onClick={() => setRow(r.id, { status: 'archived' })}>Archive</button>
                  </div>

                  <div className="row" style={{ marginTop: 8, gap: 8 }}>
                    <label>Order</label>
                    <input
                      type="number"
                      defaultValue={r.order_index || 0}
                      onBlur={(e) => setRow(r.id, { order_index: Number(e.target.value) })}
                    />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <video controls preload="metadata" style={{ width: '100%' }} playsInline>
                      <source
                        src={`/api/stream?path=${encodeURIComponent(r.file_path)}`}
                        type={guessMime(r.file_path || '')}
                      />
                      Your browser cannot play this video.
                    </video>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      <p className="muted" style={{ marginTop: 12 }}>{status}</p>
    </section>
  );
}
