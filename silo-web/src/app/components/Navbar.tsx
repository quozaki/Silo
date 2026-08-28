"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/support", label: "Support" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // lock body scroll when mobile open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav id="navbar" className={scrolled ? "scrolled" : ""} aria-label="Primary">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="Silo home">
            <span className="nav-mark" aria-hidden="true">
              <Image src="/icon.png" alt="" width={20} height={20} priority />
            </span>
            <span className="nav-brand-copy">
              <span className="nav-logo-text">SILO</span>
              <span className="nav-brand-sub">Workspace</span>
            </span>
          </Link>

          <div className="nav-links" role="navigation" aria-label="Sections">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={active ? "nav-link active" : "nav-link"}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="nav-actions">
            <span className="nav-status" aria-hidden="true"><i /> Operational</span>
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href="/download" className="btn-primary nav-cta">
              Download<span className="cta-extra"> Silo</span>
            </Link>
            <button
              className="nav-burger"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                {open ? (
                  <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M2 4.5H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M2 8H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M2 11.5H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <>
          <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={-1} />
          <div id="mobile-nav" className="mobile-nav" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="mobile-nav-inner">
              {NAV_LINKS.map((l) => {
                const active = pathname === l.href || (l.href !== "/" && pathname?.startsWith(l.href));
                return (
                  <Link key={l.href} href={l.href} className={active ? "mobile-link active" : "mobile-link"}>
                    <span>{l.label}</span>
                    <span className="mobile-chevron" aria-hidden="true">→</span>
                  </Link>
                );
              })}
              <Link href="/download" className={pathname === "/download" ? "mobile-link active" : "mobile-link"}>
                <span>Download</span>
                <span className="mobile-chevron" aria-hidden="true">→</span>
              </Link>
              <Link href="/changelog" className={pathname === "/changelog" ? "mobile-link active" : "mobile-link"}>
                <span>Changelog</span>
                <span className="mobile-chevron" aria-hidden="true">→</span>
              </Link>
              <Link href="/contact" className={pathname === "/contact" ? "mobile-link active" : "mobile-link"}>
                <span>Contact</span>
                <span className="mobile-chevron" aria-hidden="true">→</span>
              </Link>

              <div className="mobile-divider" />
              <div className="mobile-actions">
                <Link href="/login" className="btn-secondary mobile-btn">Log in</Link>
                <Link href="/download" className="btn-primary mobile-btn">Download Silo</Link>
              </div>
              <div className="mobile-meta">
                <i aria-hidden="true" />
                <span>Local-first · Windows 10+ · v1.0 Beta</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
