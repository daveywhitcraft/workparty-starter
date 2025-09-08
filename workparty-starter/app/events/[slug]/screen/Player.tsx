"use client";

import { useState, useRef, useEffect } from "react";

type Item = { id: string; title: string; src: string };
type Props = { playlist: Item[]; startIndex?: number; autoPlay?: boolean };

export default function Player({ playlist, startIndex = 0, autoPlay = true }: Props) {
  const [idx, setIdx] = useState(startIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (idx >= playlist.length) setIdx(0);
  }, [idx, playlist.length]);

  const handleEnded = () => {
    setIdx((current) => (current + 1) % playlist.length);
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.load();
    if (autoPlay) {
      vid.play().catch(() => {});
    }
  }, [idx, autoPlay]);

  const current = playlist[idx];
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <video
        key={current?.id}
        ref={videoRef}
        className="w-full h-full"
        src={current?.src}
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
