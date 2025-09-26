"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: string; title: string; src: string; order?: number };
type Props = { playlist: Item[]; startIndex?: number; autoPlay?: boolean };

export default function Player({ playlist, startIndex = 0, autoPlay = true }: Props) {
  // sort by Admin order: 1 first, then 2, 3 ...
  const ordered = useMemo(() => {
    const arr = playlist.slice();
    arr.sort((a, b) => {
      const ai = a.order ?? Number.POSITIVE_INFINITY;
      const bi = b.order ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return String(a.id).localeCompare(String(b.id));
    });
    return arr;
  }, [playlist]);

  const [idx, setIdx] = useState(startIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // keep index valid if list length changes
  useEffect(() => {
    if (idx >= ordered.length) setIdx(0);
  }, [idx, ordered.length]);

  const handleEnded = () => {
    // advance and loop
    setIdx((n) => (n + 1) % ordered.length);
  };

  // do not remount the <video>. swap its src and reload.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const { src } = ordered[idx] || {};
    if (!src) return;

    if (vid.src !== src) {
      vid.src = src;
      try {
        vid.load();
      } catch {}
    }

    if (autoPlay) {
      vid.play().catch(() => {});
    }
  }, [idx, ordered, autoPlay]);

  const current = ordered[idx];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full h-full"
        autoPlay={autoPlay}
        muted
        controls
        playsInline
        preload="metadata"
        onEnded={handleEnded}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          color: "white",
          fontSize: 12,
          opacity: 0.8,
          background: "rgba(0,0,0,0.4)",
          padding: "4px 8px",
          borderRadius: 6,
        }}
      >
        {current?.title} • {idx + 1}/{ordered.length}
      </div>
    </div>
  );
}
