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
          className="fixed inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />

        {/* Top nav */}
        <header className="relative z-30">
          <nav className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
            <a href="/" className="underline text-lg">WORK.PARTY</a>
            <ul className="flex items-center gap-6">
              <li><a href="/submit" className="underline">Submit</a></li>
              <li><a href="/archive" className="underline">Archive</a></li>
              <li><a href="/about" className="underline">About</a></li>
              <li><a href="/admin" className="underline">Admin</a></li>
            </ul>
          </nav>
        </header>

        {/* Blank page content */}
        <main className="relative z-20">
          {children}
        </main>
      </body>
    </html>
  );
}
