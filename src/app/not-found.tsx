import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-text px-8">
      <p className="text-xs text-muted font-mono tracking-[0.2em] uppercase mb-8">
        404
      </p>

      <h1 className="text-5xl sm:text-6xl font-bold tracking-[-0.03em] mb-6 text-center max-w-lg leading-[1.08]">
        This page doesn&apos;t exist.
      </h1>

      <p className="text-lg text-muted max-w-md text-center leading-relaxed mb-12">
        The contract at this address was never deployed. Try the editor instead.
      </p>

      <div className="flex items-center gap-6">
        <Link
          href="/demo"
          className="inline-flex items-center h-12 px-8 text-sm font-medium text-bg bg-text hover:bg-text/90 transition-colors"
        >
          Open the editor
        </Link>
        <Link
          href="/"
          className="text-sm text-muted hover:text-text transition-colors"
        >
          Go home →
        </Link>
      </div>
    </div>
  );
}
