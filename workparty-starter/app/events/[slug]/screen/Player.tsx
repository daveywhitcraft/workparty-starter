'use client';

type PlayerProps = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
};

export default function Player({ src, poster, autoPlay = true }: PlayerProps) {
  return (
    <div className="w-full h-dvh bg-black flex items-center justify-center">
      <video
        className="w-full h-full"
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted
        loop
        controls
        playsInline
      />
    </div>
  );
}
