"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "signup";

export default function AuthShell({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <Link href="/" className="auth-brand" aria-label="Silo home"><img src="/icon.png" alt="" width={22} height={22} /><span>SILO</span><small>BETA</small></Link>
          <div className="auth-aside-copy"><div className="auth-eyebrow"><i />Focused workspace</div><h1>Every account.<br /><span>Its own place.</span></h1><p>Keep your DITOGAMES sessions organized, persistent, and ready when you are.</p></div>
          <div className="auth-model" aria-label="Silo product model"><div><strong>Game</strong><span>where you go</span></div><b>+</b><div><strong>Environment</strong><span>who you are</span></div><b>-&gt;</b><div><strong>Tab</strong><span>what is running</span></div></div>
          <div className="auth-aside-foot"><span className="auth-check">✓</span> Local-first desktop workspace</div>
        </aside>

        <main className="auth-main">
          <div className="auth-panel">
            <div className="auth-panel-head"><div className="auth-eyebrow">{isSignup ? "Get started" : "Welcome back"}</div><h2>{isSignup ? "Create your account" : "Log in to Silo"}</h2><p>{isSignup ? "Set up your account to manage downloads and early access." : "Manage your Silo access, downloads, and account details."}</p></div>
            <div className="auth-switch" role="tablist" aria-label="Account access"><Link href="/signup" className={isSignup ? "active" : ""} role="tab" aria-selected={isSignup}>Sign up</Link><Link href="/login" className={!isSignup ? "active" : ""} role="tab" aria-selected={!isSignup}>Log in</Link></div>
            <form className="auth-form" aria-label={isSignup ? "Sign up form" : "Log in form"} onSubmit={handleSubmit}>
              {isSignup && <div className="auth-field"><label htmlFor="name">Name</label><input id="name" className="auth-input" type="text" placeholder="Alex Morgan" autoComplete="name" required /></div>}
              <div className="auth-field"><label htmlFor="email">Email address</label><input id="email" className="auth-input" type="email" placeholder="you@example.com" autoComplete="email" required /></div>
              <div className="auth-field"><div className="auth-label-row"><label htmlFor="password">Password</label>{!isSignup && <Link href="/contact">Forgot password?</Link>}</div><div className="auth-password"><input id="password" className="auth-input" type={showPassword ? "text" : "password"} placeholder={showPassword ? "Enter your password" : "••••••••••••"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></div>{isSignup && <span className="auth-hint">Use at least 8 characters.</span>}</div>
              {!isSignup && <label className="remember-row"><input type="checkbox" /> <span>Keep me signed in</span></label>}
              <button type="submit" className="btn-primary auth-submit">{isSignup ? "Create account" : "Log in"}<span aria-hidden="true">-&gt;</span></button>
            </form>
            <div className="auth-divider"><span>or continue with</span></div>
            <button type="button" className="auth-google"><span className="google-mark">G</span> Continue with Google</button>
            <p className="auth-footer-copy">{isSignup ? "Already have an account?" : "Don't have an account?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Sign up"}</Link></p>
            {isSignup ? <p className="auth-legal">By creating an account, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p> : <p className="auth-legal">Demo form — authentication is not wired yet.</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
