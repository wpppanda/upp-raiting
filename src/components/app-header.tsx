"use client";

export function UpLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`reference-logo${compact ? " compact" : ""}`} aria-label="uppointment.">
    <span className="reference-logo-ribbon" aria-hidden="true" />
    <span className="reference-logo-word">{compact ? "up." : "uppointment."}</span>
  </span>;
}

export default function AppHeader({ projectName, searchQuery, onSearch, pendingCount, onBell, onSettings, onLogo, onToggleSidebar }: {
  projectName: string;
  searchQuery: string;
  onSearch: (value: string) => void;
  pendingCount: number;
  onBell: () => void;
  onSettings: () => void;
  onLogo: () => void;
  onToggleSidebar?: () => void;
}) {
  return <header className="reference-app-header">
    <button type="button" className="reference-header-menu" onClick={onToggleSidebar} aria-label="Toggle navigation">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
    <button type="button" className="reference-header-brand" onClick={onLogo} aria-label="Home"><UpLogo /></button>
    <div className="reference-header-search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
      <input aria-label="Search reviews" placeholder="Search" value={searchQuery} onChange={event => onSearch(event.target.value)} />
    </div>
    <div className="reference-header-actions">
      <button type="button" className="reference-header-bell" onClick={onBell} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 3 8H3c1-1 3-2 3-8ZM10 21h4" /></svg>
        {pendingCount > 0 && <span>{pendingCount > 9 ? "9+" : pendingCount}</span>}
      </button>
      <button type="button" className="reference-header-company" title="Business reputation" onClick={onSettings}>{projectName || "Company name"}</button>
      <button type="button" className="reference-header-avatar" onClick={onSettings} title="Profile and business reputation">CN</button>
    </div>
  </header>;
}
