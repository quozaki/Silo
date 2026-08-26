"use client";

import { useFadeIn } from "@/hooks/useFadeIn";

export default function Features() {
  useFadeIn();
  return (
    <section id="features">
      <div className="s-inner">
        <div className="s-eyebrow fade-in">Features</div>
        <h2 className="s-h2 fade-in">Everything isolated. Nothing shared.</h2>
        <p className="s-sub fade-in">Six reasons Silo works where browser profiles don&apos;t.</p>
        <div className="feat-grid">
          <div className="feat-card fade-in">
            <svg className="feat-icon" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="12" height="12" rx="2.5" />
              <rect x="19" y="3" width="12" height="12" rx="2.5" />
              <rect x="3" y="19" width="12" height="12" rx="2.5" />
              <rect x="19" y="19" width="12" height="12" rx="2.5" />
              <line x1="17" y1="3" x2="17" y2="31" strokeDasharray="2 2" strokeWidth="0.8" opacity="0.35" />
              <line x1="3" y1="17" x2="31" y2="17" strokeDasharray="2 2" strokeWidth="0.8" opacity="0.35" />
            </svg>
            <div className="feat-title">Complete isolation</div>
            <p className="feat-desc">Cookies, localStorage, IndexedDB, and session data are separated per environment. No state leaks between accounts.</p>
          </div>

          <div className="feat-card fade-in">
            <svg className="feat-icon" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="17" cy="17" r="12" />
              <ellipse cx="17" cy="17" rx="5.5" ry="12" />
              <line x1="5" y1="17" x2="29" y2="17" />
              <path d="M8 10.5c3 1.8 5.5 2.8 9 2.8s6-1 9-2.8" />
              <path d="M8 23.5c3-1.8 5.5-2.8 9-2.8s6 1 9 2.8" />
            </svg>
            <div className="feat-title">Proxy per environment</div>
            <p className="feat-desc">Assign a unique proxy to each environment. Every account runs from a distinct IP — automatically, with no manual switching.</p>
          </div>

          <div className="feat-card fade-in">
            <svg className="feat-icon" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="28" height="20" rx="3" />
              <path d="M3 12h28" />
              <circle cx="8" cy="9.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="9.5" r="1" fill="currentColor" stroke="none" />
              <rect x="7" y="17" width="8" height="5" rx="1.5" fill="currentColor" stroke="none" opacity="0.5" />
              <rect x="19" y="17" width="8" height="5" rx="1.5" fill="currentColor" stroke="none" opacity="0.22" />
            </svg>
            <div className="feat-title">Built-in game catalog</div>
            <p className="feat-desc">Launch popular browser strategy games directly from a curated list — no copying URLs, no bookmarks to manage.</p>
          </div>

          <div className="feat-card fade-in">
            <svg className="feat-icon" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 4v7M17 23v7" />
              <path d="M4 17h7M23 17h7" />
              <circle cx="17" cy="17" r="6" />
              <circle cx="17" cy="17" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
            </svg>
            <div className="feat-title">Persistent sessions</div>
            <p className="feat-desc">Log in once per account and stay logged in. Environments persist across restarts — no re-authentication, no lost progress.</p>
          </div>

          <div className="feat-card fade-in">
            <svg className="feat-icon" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="28" height="24" rx="3" />
              <path d="M3 10h28" />
              <path d="M9 7.5h1.5M13 7.5h1.5M17 7.5h1.5" />
              <rect x="7" y="16" width="9" height="2" rx="1" fill="currentColor" stroke="none" opacity="0.45" />
              <rect x="7" y="21" width="14" height="2" rx="1" fill="currentColor" stroke="none" opacity="0.28" />
              <rect x="7" y="26" width="7" height="2" rx="1" fill="currentColor" stroke="none" opacity="0.18" />
            </svg>
            <div className="feat-title">Clean workspace</div>
            <p className="feat-desc">A minimal tab bar, a sidebar for your games and environments, and nothing else. Focused on the game, not the tooling around it.</p>
          </div>

          <div className="feat-card fade-in">
            <svg className="feat-icon" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="6" width="24" height="18" rx="2.5" />
              <rect x="11" y="24" width="12" height="3" rx="1" />
              <rect x="13" y="27" width="8" height="1.5" rx="0.75" />
              <path d="M10 15h14M10 19h9" opacity="0.5" />
            </svg>
            <div className="feat-title">Windows native</div>
            <p className="feat-desc">Built with Electron and shipped as a real desktop app. Runs natively on Windows — no browser extension required, no web tab.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
