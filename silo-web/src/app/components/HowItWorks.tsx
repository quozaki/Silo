"use client";

import { useFadeIn } from "@/hooks/useFadeIn";

const steps = [
  { number: "01", label: "Game", title: "Choose where to go", copy: "Add a DITOGAMES site once. It becomes a destination in your workspace." },
  { number: "02", label: "Environment", title: "Choose who you are", copy: "Create named identities like Main, Farm, or Alt 1. Each keeps its own persistent session." },
  { number: "03", label: "Tab", title: "Launch and keep going", copy: "Open a Game + Environment combination as a tab. Switch between accounts when you need to." },
];

export default function HowItWorks() {
  useFadeIn();
  return <section id="how"><div className="s-inner how-layout"><div className="section-intro fade-in"><div className="s-eyebrow">The Silo model</div><h2 className="s-h2">The account is the workspace.</h2><p className="s-sub">Silo gives the things you launch, the identities you use, and the sessions you run a clear place to live.</p></div><div className="model-rail">{steps.map((step, index) => <div className="model-step fade-in" key={step.label}><div className={`model-index model-index-${index + 1}`}>{step.number}</div><div><div className="model-label">{step.label}</div><h3>{step.title}</h3><p>{step.copy}</p></div>{index < steps.length - 1 && <div className="model-arrow">-&gt;</div>}</div>)}</div></div></section>;
}
