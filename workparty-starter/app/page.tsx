// app/page.tsx
export default function Home() {
  return (
    <section className="relative flex items-center justify-center min-h-[calc(100vh-88px)] px-6">
      <div className="text-center space-y-6 bg-black/40 px-6 py-8 rounded-xl">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          NEXT WORK.PARTY
        </h1>

        <p className="text-xl md:text-3xl leading-snug">
          28/10/2025&nbsp;&nbsp;20:00-? <br className="md:hidden" />
          Schererstraße 10, 13347 Wedding Berlin
        </p>

        <div>
          <a
            href="/submit"
            className="inline-block text-lg md:text-2xl underline underline-offset-4 hover:opacity-90"
          >
            SUBMIT NOW
          </a>
        </div>
      </div>
    </section>
  );
}
