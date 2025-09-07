'use client';
import { useEffect, useState } from 'react';
import { Submission } from '@/types';

export default function AdminPage() {
  const [pass, setPass] = useState('');
  const [rows, setRows] = useState<Submission[]>([]);
  const [status, setStatus] = useState('');
  const [authed, setAuthed] = useState(false);

  async function load() {
    const resp = await fetch('/api/list-all', {
      headers: { 'x-admin': pass }
    });
    const json = await resp.json();
    setRows(json.rows || []);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('Checking...');
    try {
      const resp = await fetch('/api/list-all', {
        headers: { 'x-admin': pass }
      });
      if (resp.ok) {
        setAuthed(true);
        setStatus('Access granted');
        const json = await resp.json();
        setRows(json.rows || []);
      } else {
        setStatus('Wrong password');
      }
    } catch {
      setStatus('Network error');
    }
  }

  async function setRow(id: string, body: any) {
    setStatus('Saving...');
    const resp = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin': pass
      },
      body: JSON.stringify({ id, ...body })
    });
    if (!resp.ok) {
      setStatus('Save issue');
      return;
    }
    setStatus('Saved');
    load();
  }

  return (
    <section>
      <h1 className="title">Admin</h1>

      {!authed ? (
        <form onSubmit={handleLogin} className="row" style={{ gap: '8px' }}>
          <input
            type="password"
            placeholder="Admin pass"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button type="submit" className="btn">
            Submit
          </button>
        </form>
      ) : (
        <div className="grid">
          {rows.map((r) => (
            <div className="card" key={r.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{r.title}</b>
                <span className="muted">{r.artist_name}</span>
              </div>
              <p className="muted">
                {r.city} · {r.year}
              </p>
              <div className="row">
                <button
                  className="btn"
                  onClick={() => setRow(r.id, { status: 'approved' })}
                >
                  Approve
                </button>
                <button
                  className="btn"
                  onClick={() => setRow(r.id, { status: 'rejected' })}
                >
                  Reject
                </button>
                <button
                  className="btn"
                  onClick={() => setRow(r.id, { status: 'archived' })}
                >
                  Archive
                </button>
              </div>
              <div className="row">
                <label>Order</label>
                <input
                  type="number"
                  defaultValue={r.order_index || 0}
                  onBlur={(e) =>
                    setRow(r.id, { order_index: Number(e.target.value) })
                  }
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <video
                  controls
                  style={{ width: '100%' }}
                  src={`/api/public-url?path=${encodeURIComponent(
                    r.file_path
                  )}`}
                ></video>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="muted">{status}</p>
    </section>
  );
}
