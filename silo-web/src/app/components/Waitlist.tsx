"use client";

import { useState } from "react";
import { useFadeIn } from "@/hooks/useFadeIn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Waitlist() {
  useFadeIn();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const trimmed = email.trim();
  const isValid = EMAIL_RE.test(trimmed);
  const showInlineError = touched && trimmed.length > 0 && !isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = email.trim();
    if (!EMAIL_RE.test(t)) {
      setTouched(true);
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://formspree.io/f/mwledoaj", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: t }),
      });
      if (res.ok) {
        try {
          localStorage.setItem("silo-waitlist", JSON.stringify({ email: t, ts: Date.now() }));
        } catch {}
        setSuccess(true);
      } else {
        throw new Error();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist">
      <div className="waitlist-inner fade-in">
        <div className="s-eyebrow center">Early access</div>
        <h2 className="s-h2">Be the first in.</h2>
        <p className="wl-sub">Join the early access list. We&apos;ll reach out when Silo is ready for your workspace.</p>
        {!success ? (
          <form className="wl-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              name="email"
              className="wl-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              onBlur={() => setTouched(true)}
              aria-describedby={error || showInlineError ? "waitlist-error" : undefined}
              aria-invalid={showInlineError || !!error ? "true" : "false"}
              required
              autoComplete="email"
              enterKeyHint="done"
            />
            <button type="submit" className="wl-btn" disabled={!isValid || loading} aria-disabled={!isValid || loading ? "true" : "false"}>
              {loading ? "Submitting…" : "Get Early Access"}
            </button>
          </form>
        ) : null}
        {(error || showInlineError) && !success && (
          <div id="waitlist-error" className="wl-error show" role="alert">
            {error || "Please enter a valid email address."}
          </div>
        )}
        {success && (
          <div className="wl-success show" role="status" aria-live="polite">
            You&apos;re on the list
          </div>
        )}
      </div>
    </section>
  );
}
