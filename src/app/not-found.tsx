import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ink text-ivory flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="eyebrow">404</p>
        <h1 className="h-display mt-4">This Page Isn't in the Frame.</h1>
        <p className="lede !text-ivory/60 mt-4">
          The page you're looking for doesn't exist or has moved. The destination, however, is right where you left it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn-gold"><span>Back to VIJAYA</span></Link>
          <Link href="/check-your-date" className="btn-outline-light"><span>Check Your Date</span></Link>
        </div>
      </div>
    </main>
  );
}
