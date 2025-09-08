"use client";

import { useEffect, useRef, useState } from "react";

type Item = { id: string; title: string; src: string };
type Props = { playlist: Item[]; startIndex?: number; autoPlay?: boolean };

export default function Player({ playlist, startIndex = 0, autoPlay = true }: Props) {
  const [idx, setIdx] = useState(startIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keep index valid if playlist changes
  useEffect(() => {
    if (idx >= playlist.length) setIdx(0);
  }, [idx, playlist.length]);

  const handleEnded = () => {
    // advance and loop
    setIdx((n) => (n + 1) % playlist.length);
  };

  // IMPORTANT: do NOT remount the <video>. Instead, swap its src and reload.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // Update the src directly to avoid React remounting the element
    const { src } = playlist[idx] || {};
    if (!src) return;

    // Only update/reload if the src actually changed
    if (vid.src !== src) {
      vid.src = src;
      try {
        vid.load();
      } catch {}
    }

    if (autoPlay) {
      vid.play().catch(() => {
        // Autoplay might be blocked until a user gesture; ignore.
      });
    }
  }, [idx, playlist, autoPlay]);

  const current = playlist[idx];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {/* Single persistent video element – no key, no remount between items */}
      <video
        ref={videoRef}
        className="w-full h-full"
        // Don't set src here; we set it imperatively so the element persists
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
        {current?.title} • {idx + 1}/{playlist.length}
      </div>
    </div>
  );
}
