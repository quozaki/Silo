import { useState } from 'react'
import { useFadeIn } from '../hooks/useFadeIn'

export default function Waitlist() {
  useFadeIn()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://formspree.io/f/mwledoaj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        throw new Error()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <section id="waitlist">
      <div className="s-inner">
        <div className="waitlist-card fade-in">
          <div className="s-eyebrow center">Early access</div>
          <h2 className="s-h2">Be the first<br />to get Silo</h2>
          <p className="wl-sub">Early access is limited. Drop your email and we'll reach out when it's ready.</p>
          {!success ? (
            <div className="wl-form">
              <input
                className="wl-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                required
                autoComplete="email"
              />
              <button type="button" className="wl-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Get Early Access'}
              </button>
            </div>
          ) : null}
          {success && <div className="wl-success show">You're on the list. We'll be in touch.</div>}
          {error && <div className="wl-error show">{error}</div>}
        </div>
      </div>
    </section>
  )
}
