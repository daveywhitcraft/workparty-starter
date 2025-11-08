// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WORK.PARTY",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-white">
        {/* Full-page background */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Fixed top navigation with simple CSS spacing */}
        <header className="fixed top-0 left-0 right-0 z-30">
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px",
            }}
          >
            <a href="/" className="underline" style={{ fontSize: "1.125rem" }}>
              WORK.PARTY
            </a>

            <div style={{ display: "flex", alignItems: "center" }}>
             
            {/* <a href="/submit" className="underline" style={{ marginLeft: 24 }}>
                Submit
              </a>
              */}
              <a href="/archive" className="underline" style={{ marginLeft: 24 }}>
                Archive
              </a>
              <a href="/about" className="underline" style={{ marginLeft: 24 }}>
                About
              </a>
              <a href="/admin" className="underline" style={{ marginLeft: 24 }}>
                Admin
              </a>
            </div>
          </nav>
        </header>

        {/* Keep page content below fixed nav */}
        <main className="relative z-20" style={{ paddingTop: "88px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
