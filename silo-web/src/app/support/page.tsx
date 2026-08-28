import Link from "next/link";

export const metadata = { title: "Support — Silo" };

const FAQS = [
  { q: "Silo won’t launch — blank workspace?", a: "Ensure WebView2 is installed (bundled with installer). Try reinstalling Silo. Check silo.db in %APPDATA%/Silo — delete to reset (you’ll lose Games/Environments)." },
  { q: "Environment shows “Proxy error”?", a: "Verify socks5:// user:pass@ip:port. Test in Settings → Proxy Pool. Proxy failures fall back to direct — check system firewall." },
  { q: "Cookies bleed between accounts?", a: "They shouldn’t. Each Environment is persist:silo-uuid. If you see bleed, ensure you didn’t open the same URL outside Silo. Report with game URL + proxy dot color." },
  { q: "How to back up?", a: "Copy %APPDATA%/Silo/silo.db and proxies.json. Restore by overwriting after quit." },
  { q: "Can I use Silo for non-game sites?", a: "Yes — paste any URL as Game. But Silo isn’t a VPN/privacy browser, it’s for multi-account workflows." },
];

export default function SupportPage() {
  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="s-eyebrow center">Support</div>
        <h1>How can we help?</h1>
        <p>FAQ, troubleshooting, and ways to reach us. Response time: usually 24h.</p>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Link href="/contact" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>Contact us</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>Email + form. Best for bugs and billing.</span>
            <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 4 }}>→ /contact</span>
          </Link>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
            <div style={{ fontWeight: 600, color: "var(--text)" }}>Discord (coming soon)</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 6 }}>Join the Silo community for farmers and multi-account tips.</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 8 }}>Invite — TBD</div>
          </div>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 8 }}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{f.q}</summary>
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
