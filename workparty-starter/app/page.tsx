// app/page.tsx
export default function Home() {
  return (
    <section className="flex items-center justify-center min-h-[calc(100vh-88px)] px-6">
      <div className="text-center space-y-12">
        <h1 className="text-6xl md:text-9xl font-bold tracking-tight">
          NEXT WORK.PARTY
        </h1>

        <p className="text-3xl md:text-6xl leading-snug">
          28/10/2025&nbsp;&nbsp;20:00-? <br />
          Schererstraße 10, 13347 Wedding Berlin
        </p>

        <div>
          <a
            href="/submit"
            className="inline-block text-3xl md:text-6xl underline underline-offset-8 hover:opacity-80"
          >
            SUBMIT NOW
          </a>
        </div>
      </div>
    </section>
  );
}
