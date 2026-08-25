import { useEffect, useState } from 'react'
import { useFadeIn } from '../hooks/useFadeIn'

export default function Navbar() {
  useFadeIn()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav id="navbar" className={scrolled ? 'scrolled' : ''}>
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1.5" width="18" height="5" rx="2" fill="#f0f0f0" />
            <rect x="1" y="7.5" width="18" height="5" rx="2" fill="#f0f0f0" />
            <rect x="1" y="13.5" width="18" height="5" rx="2" fill="#f0f0f0" />
          </svg>
          <span className="nav-logo-text">Silo</span>
        </a>
        <span className="tb-title">Silo</span>
        <div className="nav-actions">
          <button className="btn-ghost-disabled" disabled>Coming Soon</button>
          <a href="#waitlist" className="btn-outline">Join Waitlist</a>
        </div>
      </div>
    </nav>
  )
}
