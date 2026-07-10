export default function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 13L8 3L13 13H3Z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-bold text-sm tracking-tight">
              Clarity<span className="text-accent">Forge</span>
            </span>
          </div>

          <p className="text-xs text-muted">
            Funded by{" "}
            <a
              href="https://zeroauthoritydao.com/funding/degrants"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text hover:text-accent transition-colors"
            >
              Stacks DeGrants
            </a>
            {" "}· Built for the Stacks ecosystem · Open source
          </p>
        </div>
      </div>
    </footer>
  );
}
