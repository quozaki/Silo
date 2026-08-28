"use client";

import Link from "next/link";
import { useState } from "react";
import { useFadeIn } from "@/hooks/useFadeIn";

type DemoTab = { game: string; environment: string; url: string; proxy: string };
const tabs: DemoTab[] = [
  { game: "StrategyCombat", environment: "Main", url: "strategycombat.com", proxy: "EU-West" },
  { game: "StrategyCombat", environment: "Farm", url: "strategycombat.com", proxy: "US-East" },
  { game: "Combat Siege", environment: "Alt 1", url: "combatsiege.com", proxy: "Direct" },
];

export default function Hero() {
  useFadeIn();
  const [activeTab, setActiveTab] = useState(0);
  const active = tabs[activeTab];
  return (
    <section id="hero">
      <div className="hero-shell">
        <div className="hero-copy">
          <div className="hero-kicker fade-in"><span className="status-pulse" />Desktop workspace for DITOGAMES</div>
          <h1 className="fade-in">One place, many accounts.<br /><span>Each completely isolated.</span></h1>
          <p className="hero-sub fade-in">Silo keeps every DITOGAMES account in its own persistent environment, so you can launch, switch, and keep going without logging in and out.</p>
          <div className="hero-ctas fade-in"><Link href="/download" className="btn-primary">Download Silo <span className="btn-arrow">-&gt;</span></Link><a href="#how" className="btn-secondary">See how it works <span className="btn-arrow">v</span></a></div>
          <div className="hero-proof fade-in"><span className="proof-mark">✓</span> Windows desktop app <span className="proof-divider" /> Local-first sessions <span className="proof-divider" /> Built for focus</div>
        </div>

        <div className="hero-product fade-in" aria-label="Silo product preview">
          <div className="product-window">
            <div className="product-titlebar"><div className="product-brand"><img src="/icon.png" alt="" width={16} height={16} /><strong>SILO</strong><span>BETA</span></div><div className="product-context">Example workspace</div><div className="window-controls"><i /><i /><i /></div></div>
            <div className="product-main">
              <aside className="product-sidebar">
                <div className="product-search"><span>⌕</span> Search workspace <kbd>Ctrl K</kbd></div>
                <div className="product-section-head"><span><small>WHERE</small>Games</span><b>+</b></div>
                <div className="product-game active"><span className="game-glyph glyph-blue">S</span><span>StrategyCombat</span><em>2</em></div>
                <div className="product-game"><span className="game-glyph glyph-green">C</span><span>Combat Siege</span><em>1</em></div>
                <div className="product-section-head env-head"><span><small>WHO</small>Environments</span><b>+</b></div>
                <div className="product-env active"><span className="live-dot live" />Main <span className="proxy-dot blue" /><em>LIVE</em></div>
                <div className="product-env"><span className="live-dot" />Farm <span className="proxy-dot orange" /><em>IDLE</em></div>
                <div className="product-env"><span className="live-dot" />Alt 1 <em>IDLE</em></div>
                <div className="sidebar-bottom"><span>◌</span> Settings <small>PROXY</small></div>
              </aside>
              <div className="product-workspace">
                <div className="product-tabs" role="tablist" aria-label="Running tabs">{tabs.map((tab, index) => <button key={`${tab.game}-${tab.environment}`} className={`product-tab ${activeTab === index ? "selected" : ""}`} onClick={() => setActiveTab(index)} role="tab" aria-selected={activeTab === index}><span className={`tab-live ${activeTab === index ? "on" : ""}`} /><span><strong>{tab.game}</strong><small> · {tab.environment}</small></span><b>x</b></button>)}<span className="tab-add">+</span></div>
                <div className="browser-view"><div className="browser-toolbar"><span className="browser-nav">&lt;　&gt;　↻</span><div className="address"><span>⌁</span>{active.url}<b>{active.proxy !== "Direct" ? `${active.proxy} · Proxy` : "No proxy"}</b></div><span className="browser-menu">...</span></div><div className="browser-content"><div className="browser-status"><span className="status-pill"><i /> {active.environment}</span><span>persistent environment</span></div><div className="browser-heading">{active.game}</div><div className="browser-lines"><i /><i /><i /><i /><i /></div><div className="browser-skeleton"><div /><div /><div /></div><div className="browser-footer"><span>Session ready</span><span>{active.proxy !== "Direct" ? active.proxy : "Direct connection"}</span></div></div></div>
              </div>
            </div>
          </div>
          <div className="product-caption"><span><i className="caption-dot blue" />Game</span><span>+</span><span><i className="caption-dot green" />Environment</span><span>-&gt;</span><strong>Running Tab</strong><span className="caption-note">Click a tab to switch identity</span></div>
        </div>
      </div>
      <div className="hero-scroll"><span>Scroll to explore</span><i /></div>
    </section>
  );
}
