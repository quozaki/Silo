import Link from "next/link";

export const metadata = { title: "Product — How Silo isolates every account" };

export default function ProductPage() {
  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="s-eyebrow center">Product</div>
        <h1>Game = what you launch.<br />Environment = who you launch as.</h1>
        <p>Silo replaces messy browser hacks with a real hierarchy. Each Environment is a sealed Chromium partition. No cookies bleed. Ever.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
          <Link href="/download" className="btn-primary">Download for Windows</Link>
          <Link href="/pricing" className="btn-secondary">See pricing</Link>
        </div>
      </div>

      {/* Comparison */}
      <div style={{ margin: "0 auto", maxWidth: 1160, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 0, background: "var(--surface-2)", padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          <span></span><span>Browser profiles</span><span>Incognito</span><span style={{ color: "var(--text)" }}>Silo</span>
        </div>
        {[
          ["Persistence", "Buried, unlabeled", "No — login every time", "Yes — stays logged in"],
          ["Hierarchy", "Flat list", "None", "Games → Environments"],
          ["Proxy per account", "Manual, global", "No", "Auto, per-Environment"],
          ["Switching", "Hidden menu", "New window", "1 click, instant"],
          ["Built for games", "No", "No", "Catalog + search"],
        ].map(([label, a, b, c]) => (
          <div key={label} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ padding: "14px 18px", color: "var(--text-secondary)", fontWeight: 600, borderRight: "1px solid var(--border)" }}>{label}</span>
            <span style={{ padding: "14px 18px", color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>{a}</span>
            <span style={{ padding: "14px 18px", color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>{b}</span>
            <span style={{ padding: "14px 18px", color: "var(--text)", fontWeight: 600, background: "var(--surface-2)" }}>{c}</span>
          </div>
        ))}
      </div>

      {/* Isolation */}
      <section id="isolation" style={{ padding: "80px 0 0" }}>
        <div className="s-eyebrow">Isolation</div>
        <h2 className="s-h2">Chromium partitions, not hacks.</h2>
        <p className="s-sub">Each Environment maps to <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 6 }}>persist:silo-&lt;uuid&gt;</code> — its own Session: cookies, localStorage, IndexedDB, Cache, tokens. Implemented with Electron <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>WebContentsView</code> per Environment. Only one view is attached at a time, all open views stay in memory. Switching = <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>browser:show</code>, closing = <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>session.clearStorageData()</code>.</p>
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {[
            { t: "No bleed", d: "Move a cookie in Main, Farm never sees it. Verified per partition." },
            { t: "Persistent", d: "Quit Silo → relaunch → still logged in. SQLite + partition persistence." },
            { t: "Wipe on delete", d: "Deleting a Game or Environment clears its partition storage." },
          ].map((x) => (
            <div key={x.t} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{x.t}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Proxy */}
      <section id="proxy" style={{ padding: "80px 0 0" }}>
        <div className="s-eyebrow">Proxy Pool (optional)</div>
        <h2 className="s-h2">One IP per account. No flag.</h2>
        <p className="s-sub">Running 10 farm accounts from one IP gets you flagged. Silo’s Proxy Pool auto-assigns the least-used proxy on Environment creation and applies it per Session via <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>session.setProxy</code>.</p>
        <div style={{ marginTop: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { color: "#a78bfa", label: "US Residential 1", ip: "socks5://user:****@203.0.113.10:1080" },
            { color: "#60a5fa", label: "EU Node", ip: "socks5://user:****@198.51.100.22:1080" },
            { color: "#fb923c", label: "Farm IP", ip: "http://****@192.0.2.50:8080" },
          ].map((p) => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: p.color, boxShadow: `0 0 8px ${p.color}`, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{p.ip}</span>
            </div>
          ))}
          <p style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 4 }}>Stored in proxies.json — color + label, never raw proxyRules in UI.</p>
        </div>
      </section>

      {/* Catalog + UI */}
      <section style={{ padding: "80px 0 0", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <div className="s-eyebrow">Game Catalog</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>No typing URLs.</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>Add Game includes a curated catalog of strategy/MMO titles with thumbnails, search, and category. Pick → name + URL pre-filled. Or enter manually.</p>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["StrategyCombat", "Global Base Combat", "Panzer Quest"].map((n) => (
              <span key={n} style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 999 }}>{n}</span>
            ))}
          </div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          <div className="s-eyebrow">UI — Precision Console</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Dark, dense, Swiss.</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>Sidebar: GAMES (top, search + 36px rows) → ENVIRONMENTS (filtered to selected game, 32px mono rows). Tab bar 40px with live dot + proxy dot. Workspace dot-grid vanishes when a browser is live.</p>
          <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 10, fontFamily: "var(--font-mono)" }}>Tokens: --bg #09090B / --accent #6366F1 / --green #22C55E</p>
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: 48, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/download" className="btn-primary">Download Silo</Link>
        <Link href="/pricing" className="btn-secondary">Compare plans</Link>
      </div>
    </div>
  );
}
