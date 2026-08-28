export const metadata = { title: "Terms — Silo" };

export default function TermsPage() {
  return (
    <div className="page-wrap legal">
      <div className="page-hero" style={{ marginBottom: 24 }}>
        <div className="s-eyebrow center">Terms</div>
        <h1>Terms of Service</h1>
        <p>Last updated: 26 Aug 2026</p>
      </div>
      <h2>Use of Silo</h2>
      <p>Silo is a workspace organiser for multi-account workflows. You are responsible for complying with each website or game’s terms when using multiple accounts and proxies.</p>
      <h2>Beta</h2>
      <p>Silo is in beta. Features may change. Back up <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>silo.db</code> before major updates.</p>
      <h2>Proxies</h2>
      <p>Silo is not a VPN or proxy seller. You supply your own proxies. Silo only routes per-Session via <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>session.setProxy</code>.</p>
      <h2>Liability</h2>
      <p>Silo is provided “as is” without warranty. Not responsible for game account actions taken via Silo.</p>
      <h2>Contact</h2>
      <p><a href="mailto:hello@silo.gg">hello@silo.gg</a> · <a href="/contact">Contact</a></p>
      <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 24 }}>Template — replace with legal counsel before launch.</p>
    </div>
  );
}
