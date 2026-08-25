import { useFadeIn } from '../hooks/useFadeIn'

export default function HowItWorks() {
  useFadeIn()
  return (
    <section id="how">
      <div className="s-inner">
        <div className="s-eyebrow fade-in">How it works</div>
        <h2 className="s-h2 fade-in">Three steps to full isolation</h2>
        <div className="steps-grid">
          <div className="step fade-in">
            <div className="step-num">01</div>
            <div className="step-title">Add your games</div>
            <p className="step-desc">Pick from the built-in catalog of popular strategy games, or enter any URL to run a site inside its own isolated context.</p>
          </div>
          <div className="step fade-in">
            <div className="step-num">02</div>
            <div className="step-title">Create environments</div>
            <p className="step-desc">Each environment is a completely isolated browser identity — its own cookies, storage, cache, and optionally its own proxy.</p>
          </div>
          <div className="step fade-in">
            <div className="step-num">03</div>
            <div className="step-title">Launch and play</div>
            <p className="step-desc">Open multiple accounts simultaneously, each on its own IP. Switch between them instantly. Nothing ever crosses between sessions.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
