import Player from './Player';

export default function ScreenPage({
  searchParams,
}: {
  searchParams: { v?: string; poster?: string; autoplay?: string };
}) {
  const src = searchParams?.v;
  const poster = searchParams?.poster;
  const autoPlay = searchParams?.autoplay !== 'false';

  if (!src) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Missing video source</h1>
        <p className="text-sm opacity-70">
          Pass a <code>?v=</code> URL to this page.
        </p>
      </div>
    );
  }

  return <Player src={src} poster={poster} autoPlay={autoPlay} />;
}
