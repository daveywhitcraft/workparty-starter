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

        {/* Fixed top navigation (original look) */}
        <header className="fixed top-0 left-0 right-0 z-30">
          <nav className="flex items-center justify-between px-6 py-6">
            <a href="/" className="underline text-lg">WORK.PARTY</a>
            <div className="flex items-center">
              <a href="/submit" className="underline ml-6">Submit</a>
              <a href="/archive" className="underline ml-6">Archive</a>
              <a href="/about" className="underline ml-6">About</a>
              <a href="/admin" className="underline ml-6">Admin</a>
            </div>
          </nav>
        </header>

        {/* Page content (padded so it isn't under the fixed menu) */}
        <main className="relative z-20 pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
