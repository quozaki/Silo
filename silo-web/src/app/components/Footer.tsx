"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/" className="footer-logo">
            <span className="footer-mark" aria-hidden="true">
              <img src="/icon.png" alt="" width={18} height={18} style={{ width: 18, height: 18, borderRadius: 4, display: "block" }} />
            </span>
            <span className="footer-logo-name">Silo</span>
            <span className="footer-beta">BETA</span>
          </Link>
          <p className="footer-tagline">One place, many accounts — each completely isolated.</p>
          <p className="footer-copy">© 2026 Silo. All rights reserved.</p>
        </div>

        <div className="footer-col">
          <h3 className="footer-heading">Product</h3>
          <Link href="/product" className="footer-link">Overview</Link>
          <Link href="/product#isolation" className="footer-link">Isolation</Link>
          <Link href="/product#proxy" className="footer-link">Proxy Pool</Link>
          <Link href="/download" className="footer-link">Download</Link>
          <Link href="/pricing" className="footer-link">Pricing</Link>
        </div>

        <div className="footer-col">
          <h3 className="footer-heading">Resources</h3>
          <Link href="/resources" className="footer-link">Guides</Link>
          <Link href="/changelog" className="footer-link">Changelog</Link>
          <Link href="/support" className="footer-link">Support</Link>
          <Link href="/contact" className="footer-link">Contact</Link>
        </div>

        <div className="footer-col">
          <h3 className="footer-heading">Legal</h3>
          <Link href="/privacy" className="footer-link">Privacy</Link>
          <Link href="/terms" className="footer-link">Terms</Link>
          <Link href="/login" className="footer-link">Log in</Link>
          <Link href="/signup" className="footer-link">Sign up</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Built for desktop workflows · Windows 10+</span>
        <span className="footer-bottom-dot" aria-hidden="true">·</span>
        <span>Early access for DITOGAMES players</span>
      </div>
    </footer>
  );
}
