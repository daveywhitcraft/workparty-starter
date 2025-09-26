// app/page.tsx
"use client";
import React from "react";

export default function Page() {
  return (
    <>
      {/* Centered Event Info */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          zIndex: 25, // header is z-30 in layout
          pointerEvents: "none", // allow nav clicks
        }}
      >
        <div style={{ textAlign: "center", pointerEvents: "auto" }}>
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
            28/09/2025&nbsp;&nbsp;20:00-? <br />
            Schererstraße 10, 13347 Wedding Berlin
          </div>
 {/*
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
          */}
        </div>
      </div>

      {/* Blinking Floating Button */}
     {/*  <a
        href="/submit"
        className="wp-blink-btn"
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          background: "#e6e6e6",
          color: "#0b0b0b",
          padding: "1rem 2rem",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "1rem",
          textDecoration: "none",
          zIndex: 50,
        }}
      >
        SUBMIT NOW
      </a>
*/}
      {/* styled-jsx needs a Client Component; this is marked with "use client" */}
      <style jsx global>{`
        @keyframes wp-blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0; }
        }
        .wp-blink-btn { animation: wp-blink 5s infinite; }
      `}</style>
    </>
  );
}
