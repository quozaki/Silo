import Link from "next/link";

export const metadata = { title: "Pricing — Silo plans" };

const FEATURES = [
  { label: "Games", free: "3", pro: "Unlimited" },
  { label: "Environments per game", free: "3", pro: "Unlimited" },
  { label: "Chromium isolation", free: "✓", pro: "✓" },
  { label: "Proxy Pool (auto-assign)", free: "—", pro: "✓" },
  { label: "Game catalog", free: "✓", pro: "✓" },
  { label: "Persistent sessions", free: "✓", pro: "✓" },
  { label: "Updates", free: "Community", pro: "Priority" },
  { label: "Support", free: "Community", pro: "Email + Discord" },
];

export default function PricingPage() {
  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="s-eyebrow center">Pricing</div>
        <h1>Simple. Start free, scale when you need proxies.</h1>
        <p>Free covers solo players. Pro unlocks unlimited hierarchy and Proxy Pool for farmers.</p>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card">
          <div className="s-eyebrow">Free</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>$0</span><span style={{ color: "var(--text-muted)", fontSize: 13 }}>/ forever</span></div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>For trying Silo. 3 games, 3 envs each. Full isolation, catalog, and persistence.</p>
          <Link href="/download" className="btn-secondary" style={{ textAlign: "center", justifyContent: "center" }}>Download Free</Link>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            <li>✓ 3 games · 3 envs / game</li><li>✓ Isolation · Catalog · Persistence</li><li style={{ color: "var(--text-dim)" }}>— No Proxy Pool</li>
          </ul>
        </div>

        <div className="pricing-card featured">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="s-eyebrow" style={{ margin: 0 }}>Pro</span><span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "var(--text)", color: "var(--bg)", padding: "3px 7px", borderRadius: 999 }}>POPULAR</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>$9</span><span style={{ color: "var(--text-muted)", fontSize: 13 }}>/ month</span></div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>Unlimited games & environments. Proxy Pool with auto-assign and per-env color.</p>
          <Link href="/signup" className="btn-primary" style={{ textAlign: "center", justifyContent: "center" }}>Get Pro — $9/mo</Link>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text)" }}>
            <li>✓ Unlimited games & envs</li><li>✓ Proxy Pool · Auto-assign</li><li>✓ Priority updates & support</li>
          </ul>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ marginTop: 40, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", background: "var(--surface-2)", padding: "12px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          <span>Feature</span><span>Free</span><span>Pro</span>
        </div>
        {FEATURES.map((f) => (
          <div key={f.label} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", background: "var(--surface)", borderTop: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ padding: "12px 16px", color: "var(--text-secondary)", borderRight: "1px solid var(--border)", fontWeight: 500 }}>{f.label}</span>
            <span style={{ padding: "12px 16px", color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}>{f.free}</span>
            <span style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 600 }}>{f.pro}</span>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 48, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
        <h2 className="s-h2" style={{ textAlign: "center", fontSize: 22 }}>FAQ</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          {[
            { q: "Is Free really free?", a: "Yes. No card required. Use 3 games locally forever. Pro is only if you need unlimited and proxies." },
            { q: "Do I need proxies?", a: "Only if you run many farm accounts from one IP. Free works without proxies. Pro’s pool just automates assignment." },
            { q: "Will my logins persist?", a: "Yes. Each Environment is a persisted partition (persist:silo-uuid). Quit and relaunch — still logged in." },
            { q: "Windows only?", a: "Today yes (Electron 43). macOS/Linux are on the roadmap — join waitlist on Home." },
          ].map((x) => (
            <details key={x.q} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{x.q}</summary>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
