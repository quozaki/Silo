"use client";

import { useFadeIn } from "@/hooks/useFadeIn";

const features = [
  { index: "A", title: "Accounts stay separate", copy: "Every Environment keeps its own session and state. Your accounts do not bleed into each other." },
  { index: "B", title: "Sessions stay ready", copy: "Sign in once, then come back to the same identity after you close and relaunch Silo." },
  { index: "C", title: "The workspace stays clear", copy: "Games, Environments, and running Tabs make the next action obvious without browser-profile clutter." },
];

export default function Features() {
  useFadeIn();
  return <section id="features"><div className="s-inner"><div className="feature-heading"><div className="s-eyebrow fade-in">Why Silo</div><h2 className="s-h2 fade-in">Less account juggling.<br /><span>More time in the game.</span></h2></div><div className="feature-list">{features.map((feature) => <article className="feature-row fade-in" key={feature.index}><span className="feature-index">{feature.index}</span><h3>{feature.title}</h3><p>{feature.copy}</p><span className="feature-chevron">-&gt;</span></article>)}</div></div></section>;
}
