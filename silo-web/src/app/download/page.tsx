import Link from "next/link";

export const metadata = { title: "Download — Silo for Windows" };

export default function DownloadPage() {
  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="s-eyebrow center">Download</div>
        <h1>Run Silo on Windows.</h1>
        <p>One installer, isolated partitions, stays logged in. No browser extension.</p>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center", boxShadow: "0 20px 48px rgba(0,0,0,0.35)" }}>
        <div style={{ width: 56, height: 56, margin: "0 auto 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, display: "grid", placeItems: "center", overflow: "hidden", padding: 6 }}>
          <img src="/icon.png" alt="" width={44} height={44} style={{ width: 44, height: 44, objectFit: "contain", display: "block" }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Silo 1.0.0 — Windows</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, fontFamily: "var(--font-mono)" }}>NSIS · x64 · Electron 43 · ~90 MB</p>
        <a href="#" className="btn-primary" style={{ display: "inline-flex", marginTop: 18, padding: "14px 28px", fontSize: 15 }}>Download for Windows</a>
        <p style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 10 }}>Version 1.0.0 · SHA256 on release page</p>
        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 999, fontFamily: "var(--font-mono)" }}>Windows 10+</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 999, fontFamily: "var(--font-mono)" }}>WebView2 required</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 999, fontFamily: "var(--font-mono)" }}>Auto-updates via electron-updater</span>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "32px auto 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>System requirements</h3>
          <ul style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: 16 }}>
            <li>Windows 10 22H2 or Windows 11</li><li>4 GB RAM (8 GB recommended)</li><li>300 MB disk + partition storage</li><li>WebView2 runtime (installed with app)</li>
          </ul>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>What’s inside</h3>
          <ul style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: 16 }}>
            <li>Isolation via persist:silo-uuid</li><li>Proxy Pool (socks5/http)</li><li>Game catalog + SQLite (sql.js)</li><li>No data leaves device</li>
          </ul>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "24px auto 0", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16a4 4 0 100-8 4 4 0 000 8z" /><path d="M12 8V6" /><path d="M12 18v-2" /></svg>
        </span>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>Need help installing? See <Link href="/support" style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 3 }}>Support</Link> or <Link href="/contact" style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 3 }}>Contact</Link>.</div>
      </div>
    </div>
  );
}
