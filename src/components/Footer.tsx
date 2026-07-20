import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="max-w-6xl mx-auto px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <span className="text-xs text-muted">
          ClarityForge — The Remix of Stacks
        </span>
        <div className="flex items-center gap-6 text-xs text-muted">
          <Link href="/demo" className="hover:text-text transition-colors">Demo</Link>
          <Link href="/templates" className="hover:text-text transition-colors">Templates</Link>
          <Link href="/dashboard" className="hover:text-text transition-colors">Dashboard</Link>
          <a href="https://github.com/subheeksh5599/ClarityForge" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
