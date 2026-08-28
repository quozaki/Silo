export const metadata = { title: "Changelog — Silo" };

export default function ChangelogPage() {
  return (
    <div className="page-wrap" style={{ maxWidth: 760 }}>
      <div className="page-hero" style={{ marginBottom: 32 }}>
        <div className="s-eyebrow center">Changelog</div>
        <h1>What’s new in Silo.</h1>
        <p>Version history. Follows semver.</p>
      </div>

      {[
        { v: "1.0.0", d: "2026-08-26", items: ["Initial public beta — Windows NSIS x64", "Isolation via persist:silo-uuid + WebContentsView", "Proxy Pool with auto-assign + color dots", "Game catalog (15 titles) + SQLite via sql.js", "Precision Console dark UI (280px sidebar, 40px tabs)"] },
        { v: "0.9.0", d: "2026-08-20", items: ["Split sidebar: GAMES (42%) → ENVIRONMENTS (58% filtered)", "Centered SILO BETA titlebar", "Welcome + SpecularButton (ogl)"] },
        { v: "0.8.0", d: "2026-08-10", items: ["Proxy Pool JSON storage, least-used assignment", "Tab bar with proxy + live dots"] },
      ].map((r) => (
        <div key={r.v} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>{r.v}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 999 }}>{r.d}</span>
          </div>
          <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            {r.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
