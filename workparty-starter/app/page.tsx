// app/page.tsx
export default function Home() {
  return (
    <section style={{ position: "relative" }}>
      {/* Full-screen centered overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          zIndex: 25, // higher than your main content (layout uses z-20)
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(48px, 12vw, 220px)",
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            NEXT WORK.PARTY
          </h1>
