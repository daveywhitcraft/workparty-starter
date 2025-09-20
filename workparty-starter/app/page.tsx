// app/page.tsx
export default function Home() {
  return (
    <section className="flex items-center justify-center min-h-[calc(100vh-88px)]">
      <div className="text-center">
        <h1 className="text-[8rem] font-extrabold leading-tight">
          NEXT WORK.PARTY
        </h1>

        <p className="text-[4rem] mt-12 leading-snug">
          28/10/2025&nbsp;&nbsp;20:00-? <br />
          Schererstraße 10, 13347 Wedding Berlin
        </p>

        <a
          href="/submit"
          className="mt-16 inline-block text-[4rem] underline underline-offset-8 hover:opacity-80"
        >
          SUBMIT NOW
        </a>
      </div>
    </section>
  );
}
