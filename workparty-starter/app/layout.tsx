import './globals.css';
import Link from 'next/link';
export const metadata = { title: 'WORK.PARTY', description: 'Submissions, screening, archive' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><Link href="/">WORK.PARTY</Link></div>
          <nav className="row" style={{gap:16}}>
            <Link href="/submit">Submit</Link>
          
            <Link href="/archive">Archive</Link>
            <Link href="/about">About</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
