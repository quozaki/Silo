export const metadata = { title: "Privacy — Silo" };

export default function PrivacyPage() {
  return (
    <div className="page-wrap legal">
      <div className="page-hero" style={{ marginBottom: 24 }}>
        <div className="s-eyebrow center">Privacy</div>
        <h1>Privacy Policy</h1>
        <p>Last updated: 26 Aug 2026</p>
      </div>
      <p>Silo is a local-first desktop app. Your Games and Environments are stored in <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>%APPDATA%/Silo/silo.db</code> and proxies in <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>proxies.json</code>. We don’t run a cloud sync for your partitions — cookies stay on device.</p>
      <h2>What we collect</h2>
      <p>Website analytics (page views) and, if you join the waitlist, your email. The app itself does not phone home with your proxy IPs or session cookies.</p>
      <h2>Cookies</h2>
      <p>The marketing site uses minimal cookies for analytics. The desktop app’s partitions each have their own cookie jar — never mixed.</p>
      <h2>Data retention</h2>
      <p>Waitlist emails until you unsubscribe. App data until you delete the app folder.</p>
      <h2>Contact</h2>
      <p>Questions: <a href="mailto:hello@silo.gg">hello@silo.gg</a> · <a href="/contact">Contact form</a></p>
      <h2>Template notice</h2>
      <p style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Replace this template with legal counsel review before launch. Not a substitute for legal advice.</p>
    </div>
  );
}
