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
        {/* Background image */}
        <div
          className="fixed inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />

        {/* Fixed top navigation */}
        <header className="fixed top-0 left-0 right-0 z-30">
          <nav className="flex items-center justify-between px-6 py-6">
            <a href="/" className="underline text-lg">WORK.PARTY</a>
            <div className="flex gap-6">
              <a href="/submit" className="underline">Submit</a>
              <a href="/archive" className="underline">Archive</a>
              <a href="/about" className="underline">About</a>
              <a href="/admin" className="underline">Admin</a>
            </div>
          </nav>
        </header>

        {/* Page content, padded so it doesn't hide under nav */}
        <main className="relative z-20 pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
