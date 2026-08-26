"use client";

import { useFadeIn } from '@/hooks/useFadeIn'

export default function Footer() {
  useFadeIn()
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-left">
          <a href="#" className="footer-logo">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1.5" width="18" height="5" rx="2" fill="#f0f0f0" />
              <rect x="1" y="7.5" width="18" height="5" rx="2" fill="#f0f0f0" />
              <rect x="1" y="13.5" width="18" height="5" rx="2" fill="#f0f0f0" />
            </svg>
            <span className="footer-logo-name">Silo</span>
          </a>
          <span className="footer-copy">© 2026 Silo. All rights reserved.</span>
        </div>
        <div className="footer-right">Built on Electron</div>
      </div>
    </footer>
  )
}

