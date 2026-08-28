import Link from "next/link";

export const metadata = { title: "Resources — Silo" };

export default function ResourcesPage() {
  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="s-eyebrow center">Resources</div>
        <h1>Guides, docs, and updates.</h1>
        <p>Everything to get the most out of Silo’s isolation.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 1160, margin: "0 auto" }}>
        {[
          { title: "Quick start", desc: "Add your first Game and Environment in 2 minutes.", href: "/product", tag: "Guide" },
          { title: "Proxy Pool deep dive", desc: "Auto-assign, colors, socks5/http, per-Session routing.", href: "/product#proxy", tag: "Guide" },
          { title: "Isolation explained", desc: "Why persist:silo-uuid beats browser profiles.", href: "/product#isolation", tag: "Doc" },
          { title: "Changelog", desc: "Version history, fixes, and roadmap.", href: "/changelog", tag: "Updates" },
          { title: "Support FAQ", desc: "Troubleshooting, backups, and limits.", href: "/support", tag: "Help" },
          { title: "Contact", desc: "Reach the team for bugs or billing.", href: "/contact", tag: "Contact" },
        ].map((r) => (
          <Link key={r.title} href={r.href} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, textDecoration: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{r.tag}</span>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{r.title}</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{r.desc}</span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 4 }}>→ {r.href}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
