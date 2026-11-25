import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-surface-page text-foreground flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">404</p>
      <h1 className="font-doto roundness-100 mt-2 text-4xl font-black tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
        >
          Back home
        </Link>
        <Link
          href="/dashboard"
          className="border-border hover:bg-surface-hover inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
