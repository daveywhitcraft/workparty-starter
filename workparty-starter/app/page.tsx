// app/page.tsx
import React from "react";

export default function Page() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        zIndex: 25, // above your layout's z-20
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "clamp(48px, 12vw, 220px)",
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          NEXT WORK.PARTY
        </div>

        <div
          style={{
            fontSize: "clamp(28px, 6.5vw, 110px)",
            marginTop: "2rem",
            lineHeight: 1.15,
          }}
        >
          28/10/2025&nbsp;&nbsp;20:00-? <br />
          Schererstraße 10, 13347 Wedding Berlin
        </div>

        <a
          href="/submit"
          style={{
            display: "inline-block",
            marginTop: "2.5rem",
            fontSize: "clamp(28px, 6.5vw, 110px)",
            textDecoration: "underline",
          }}
        >
          SUBMIT NOW
        </a>
      </div>
    </div>
  );
}
