"use client";

import { useFadeIn } from "@/hooks/useFadeIn";

export default function HowItWorks() {
  useFadeIn();
  return (
    <section id="how">
      <div className="s-inner">
        <div className="s-eyebrow fade-in">How it works</div>
        <h2 className="s-h2 fade-in">Three steps to full isolation</h2>
        <div className="steps-grid">
          <div className="step fade-in">
            <div className="step-num">01</div>
            <div className="step-title">Pick a game</div>
            <p className="step-desc">Choose from the built-in catalog of browser strategy games, or paste any URL. Silo handles the rest.</p>
          </div>
          <div className="step fade-in">
            <div className="step-num">02</div>
            <div className="step-title">Create environments</div>
            <p className="step-desc">Each environment is a sealed browser identity. Different cookies, different storage, different IP. Completely separate.</p>
          </div>
          <div className="step fade-in">
            <div className="step-num">03</div>
            <div className="step-title">Launch and play</div>
            <p className="step-desc">Click an environment to open it. Switch between accounts instantly. Nothing ever leaks between sessions.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
