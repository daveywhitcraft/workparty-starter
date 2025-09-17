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
      <body className="min-h-screen">
        {/* Background image */}
        <div
          className="fixed inset-0 z-0 bg-center bg-cover"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />

        {/* Dark overlay for readability */}
        <div className="fixed inset-0 z-10 bg-black/40" />

        {/* Page content goes above background */}
        <div className="relative z-20">
          {children}
        </div>
      </body>
    </html>
  );
}
