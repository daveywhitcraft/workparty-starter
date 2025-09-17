export default function Home() {
  return (
    <section
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      {/* optional overlay + content */}
      <div className="min-h-screen bg-black/50 flex items-center justify-center text-white text-center px-4">
        <h1 className="title">WORK.PARTY</h1>
      </div>
    </section>
  );
}
