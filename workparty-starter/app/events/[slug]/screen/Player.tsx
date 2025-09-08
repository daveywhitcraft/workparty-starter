"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title?: string | null;
  file_path?: string | null;
  created_at?: string | null;
  artist_name?: string | null;
};

export default function Player({ items }: { items: Item[] }) {
  const filtered = useMemo(() => items.filter((i) => !!i.file_path), [items]);
  const [i, setI] = useState(0);
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const cur = filtered[i];

  function next() { if (i < filtered.length - 1) setI(i + 1); }
  function prev() { if (i > 0) setI(i - 1); }

  if (filtered.length === 0) {
    return <div style={{ padding: 24 }}>No playable items.</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <video
        key={cur.id}
        ref={vidRef}
        src={cur.file_path || undefined}
        controls
        style={{ width: "100%", maxWidth: 1000, background: "black" }}
      />
      <div style={{ marginTop: 12 }}>
        <strong>{cur.artist_name}</strong> — {cur.title}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button onClick={prev}>Prev</button>
        <button onClick={next}>Next</button>
      </div>
    </div>
  );
}
