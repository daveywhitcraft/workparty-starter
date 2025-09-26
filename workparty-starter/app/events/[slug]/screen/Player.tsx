// app/events/[slug]/screen/Player.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PlaylistItem = {
  id: string;
  title: string;
  bucket: string;
  path: string;
};

type Props = {
  items: PlaylistItem[];
  startIndex?: number;
  muted?: boolean;
  loopAll?: boolean;
  autoPlay?: boolean;
};

function buildPublicUrl(item: PlaylistItem) {
  // Works when the bucket is public in Supabase
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${item.bucket}/${item.path}`;
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
    return buildPublicUrl(items[idx]);
  }, [items, idx]);

  // Advance on ended
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onEnded = () => {
      if (items.length === 0) return;
      const next = idx + 1;
      if (next < items.length) {
        setIdx(next);
      } else if (loopAll) {
        setIdx(0);
      }
    };

    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [idx, items.length, loopAll]);

  // Autoplay current source when it changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Attempt autoplay after source swap
    const play = async () => {
      try {
        if (autoPlay) await el.play();
      } catch {
        // ignore autoplay rejections
      }
    };
    play();
  }, [src, autoPlay]);

  if (items.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <p>No videos to play.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <video
        ref={videoRef}
        key={src} // force reload on source change
        src={src}
        controls={false}
        muted={muted}
        playsInline
        autoPlay={autoPlay}
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
