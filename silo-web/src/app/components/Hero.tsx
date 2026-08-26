"use client";

import { useFadeIn } from "@/hooks/useFadeIn";

export default function Hero() {
  useFadeIn();
  const handleWaitlistClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("waitlist");
    const input = document.getElementById("waitlist-email");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => input?.focus(), 420);
  };
  return (
    <section id="hero">
      <div className="hero-inner">
        <div className="pill fade-in">
          <span className="pill-dot"></span>Early Access · Windows only
        </div>
        <h1 className="fade-in">Run every account in its own universe.</h1>
        <p className="hero-sub fade-in">Silo gives each game account a fully isolated browser session — separate cookies, storage, and IP. Open ten accounts. Nothing crosses.</p>
        <div className="hero-ctas fade-in">
          <a href="#waitlist" className="btn-primary" onClick={handleWaitlistClick}>
            Join the Waitlist
          </a>
          <a href="#features" className="btn-secondary">
            Learn More
          </a>
        </div>

        <div className="mockup-wrap fade-in">
          <div className="app-mockup">
            <div className="mockup-titlebar">
              <div className="tb-dot tb-close"></div>
              <div className="tb-dot tb-min"></div>
              <div className="tb-dot tb-max"></div>
              <span className="tb-title">Silo</span>
            </div>
            <div className="mockup-body">
              <div className="m-sidebar">
                <div className="sb-label">Games</div>
                <div className="sb-game active">
                  <svg className="g-icon" viewBox="0 0 26 26" fill="none">
                    <rect width="26" height="26" rx="6" fill="#1a2740" />
                    <rect x="5" y="10" width="16" height="6" rx="2" fill="#3a7bd5" opacity="0.85" />
                    <rect x="9" y="5" width="8" height="6" rx="1.5" fill="#2a5caa" opacity="0.7" />
                  </svg>
                  <span className="g-name">Forge of Empires</span>
                </div>
                <div className="sb-game">
                  <svg className="g-icon" viewBox="0 0 26 26" fill="none">
                    <rect width="26" height="26" rx="6" fill="#1a2a1a" />
                    <circle cx="13" cy="13" r="6" fill="#2d7a2d" opacity="0.7" />
                    <circle cx="13" cy="13" r="3" fill="#5cb85c" opacity="0.55" />
                  </svg>
                  <span className="g-name">Tribal Wars</span>
                </div>
                <div className="sb-game">
                  <svg className="g-icon" viewBox="0 0 26 26" fill="none">
                    <rect width="26" height="26" rx="6" fill="#251a2a" />
                    <polygon points="13,6 21,20 5,20" fill="#9c4dc5" opacity="0.6" />
                  </svg>
                  <span className="g-name">Grepolis</span>
                </div>
                <div className="sb-divider"></div>
                <div className="sb-label top-gap">Environments</div>
                <div className="sb-env">
                  <div className="e-dot e-dot-live"></div>
                  <span className="e-name">Main</span>
                  <span className="e-proxy-dot" style={{ background: "#60a5fa", color: "#60a5fa" }} aria-hidden="true"></span>
                  <span className="e-badge live">Live</span>
                </div>
                <div className="sb-env">
                  <div className="e-dot"></div>
                  <span className="e-name">Alt 1</span>
                  <span className="e-badge idle">Idle</span>
                </div>
                <div className="sb-env">
                  <div className="e-dot"></div>
                  <span className="e-name">Farm</span>
                  <span className="e-proxy-dot" style={{ background: "#fb923c", color: "#fb923c" }} aria-hidden="true"></span>
                  <span className="e-badge idle">Idle</span>
                </div>
              </div>
              <div className="m-main">
                <div className="m-tabbar">
                  <div className="m-tab active">
                    <div className="t-dot t-dot-live"></div>
                    Main
                  </div>
                  <div className="m-tab inactive">
                    <div className="t-dot"></div>
                    Alt 1
                  </div>
                </div>
                <div className="m-content">
                  <div className="browser-shell">
                    <div className="b-urlbar">
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <circle cx="4.5" cy="4.5" r="4" stroke="#3a3a3a" strokeWidth="1" />
                        <path d="M4.5 2.5v2l1.2 1.2" stroke="#3a3a3a" strokeWidth="1" strokeLinecap="round" />
                      </svg>
                      <div className="b-pill">
                        <span className="b-url">forgeofempires.com</span>
                        <span className="b-proxy">US-West · Proxy</span>
                      </div>
                    </div>
                    <div className="b-page">
                      <div className="b-block"></div>
                      <div className="b-line w78"></div>
                      <div className="b-line w60"></div>
                      <div className="b-spacer"></div>
                      <div className="b-line w86"></div>
                      <div className="b-line w55"></div>
                      <div className="b-line w72"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
