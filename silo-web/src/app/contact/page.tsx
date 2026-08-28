"use client";

export default function ContactPage() {
  return (
    <div className="page-wrap">
      <div className="page-hero">
        <div className="s-eyebrow center">Contact</div>
        <h1>Get in touch</h1>
        <p>Bug report, feature idea, or billing question — we read everything.</p>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "start" }}>
        <form className="auth-card" style={{ maxWidth: "none" }} onSubmit={(e) => e.preventDefault()} aria-label="Contact form">
          <div className="auth-field"><label htmlFor="name">Name</label><input id="name" className="auth-input" placeholder="Alex" required /></div>
          <div className="auth-field"><label htmlFor="email">Email</label><input id="email" className="auth-input" type="email" placeholder="you@example.com" required /></div>
          <div className="auth-field"><label htmlFor="subject">Subject</label><input id="subject" className="auth-input" placeholder="Proxy not connecting" required /></div>
          <div className="auth-field"><label htmlFor="message">Message</label><textarea id="message" className="auth-input" rows={5} placeholder="Tell us what happened..." style={{ resize: "vertical" }} required /></div>
          <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>Send message</button>
          <p style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", fontFamily: "var(--font-mono)", marginTop: 8 }}>Demo — wire to Formspree / API later.</p>
        </form>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Email</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginTop: 4 }}><a href="mailto:hello@silo.gg" style={{ color: "var(--text)", textDecoration: "underline", textUnderlineOffset: 3 }}>hello@silo.gg</a></div></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Response time</div><div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6 }}>Usually 24h. Priority for Pro users.</div></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>App data</div><div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6, fontFamily: "var(--font-mono)" }}>silo.db + proxies.json in %APPDATA%/Silo</div></div>
        </div>
      </div>
    </div>
  );
}
