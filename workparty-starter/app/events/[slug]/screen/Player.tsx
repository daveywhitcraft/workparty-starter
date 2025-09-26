// app/events/[slug]/screen/Player.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PlaylistItem = {
  id: string;
  title: string;
  path: string; // we build the URL via /api/public-url
};

type Props = {
  items: PlaylistItem[];
  startIndex?: number;
  muted?: boolean;
  loopAll?: boolean;
  autoPlay?: boolean;
};

function buildUrl(path: string) {
  // Use the same helper route Admin uses so we don't need bucket names
  return `/api/public-url?path=${encodeURIComponent(path)}`;
}

export default function Player({
  items,
  startIndex = 0,
  muted = true,
  loopAll = true,
  autoPlay = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [idx, setIdx] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0))
  );

  const src = useMemo(() => {
    if (items.length === 0) return "";
    return buildUrl(items[idx].path);
  }, [items, idx]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onEnded = () => {
      if (items.length === 0) return;
      const next = idx + 1;
      if (next < items.length) setIdx(next);
      else if (loopAll) setIdx(0);
    };

    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [idx, items.length, loopAll]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = async () => {
      try {
        if (autoPlay) await el.play();
      } catch {}
    };
    tryPlay();
  }, [src, autoPlay]);

  if (items.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <p>No videos to play.</p>
      </div>
    );
  }

  const handleError = () => {
    const next = idx + 1;
    if (next < items.length) setIdx(next);
    else if (loopAll) setIdx(0);
  };

  const handleLoadedData = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (autoPlay) await el.play();
    } catch {}
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <video
        ref={videoRef}
        key={src}
        src={src}
        controls={false}
        muted={muted}
        playsInline
        autoPlay={autoPlay}
        preload="auto"
        onError={handleError}
        onLoadedData={handleLoadedData}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          background: "black",
        }}
      />
    </div>
  );
}
