import React from 'react';
import { Link } from 'react-router-dom';

const TESTIMONIALS = [
  {
    quote: '"Passkeys rolled out in one single afternoon. Our support queue for lost passwords simply went quiet."',
    name: 'Nora Lindqv',
    role: 'Co-founder, Tidewater',
    initials: 'NL',
    avatarClass: 'avatar--a',
  },
  {
    quote: '"Exactly the right mix of strictness and ease. It let us ship our new app weeks ahead of the plan we made."',
    name: 'Ravi Shankar',
    role: 'Head of Platform at Copperline AI',
    initials: 'RS',
    avatarClass: 'avatar--b',
  },
  {
    quote: '"Sign-in is now the part nobody asks about. Rollout was quick, and the final flow feels really finished."',
    name: 'Maren Okonkwo',
    role: 'Design Lead at Fernhill Co',
    initials: 'MO',
    avatarClass: 'avatar--c',
  },
];

export default function KeylightBrandPanel({
  headline = 'Unlock calmly. Grow without worry.',
  subcopy = 'Sign in with a glance, not a guess. Made to keep every team in flow while each account stays sealed.',
}) {
  return (
    <aside className="brand" aria-label="About Keylight">
      <div className="brand__inset brand__top">
        <Link className="logo" to="/" aria-label="Keylight home">
          <span className="logo__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9.5" r="5" stroke="#030712" strokeWidth="2.6" />
              <rect x="10.7" y="13" width="2.6" height="8" rx="1.3" fill="#030712" />
            </svg>
          </span>
          <span className="logo__word">keylight.</span>
        </Link>
      </div>

      <div className="brand__mid">
        <div className="brand__inset hero">
          <h2 className="hero__title">{headline}</h2>
          <p className="hero__copy">{subcopy}</p>
        </div>

        {/* 42s Endless Marquee of Frosted-Glass Testimonial Cards */}
        <div className="reel" aria-label="What teams say">
          <div className="reel__track">
            {[0, 1, 2].flatMap((loopIdx) =>
              TESTIMONIALS.map((t, idx) => (
                <figure
                  key={`${loopIdx}-${idx}`}
                  className="card"
                  aria-hidden={loopIdx > 0 ? 'true' : undefined}
                  style={{ margin: 0 }}
                >
                  <blockquote className="card__quote">{t.quote}</blockquote>
                  <figcaption className="card__who">
                    <span className="card__id">
                      <span className="card__name">{t.name}</span>
                      <span className="card__role">{t.role}</span>
                    </span>
                    <span className={`avatar ${t.avatarClass}`} aria-hidden="true">
                      {t.initials}
                    </span>
                  </figcaption>
                </figure>
              ))
            )}
          </div>
        </div>

        {/* Customer marks & social proof */}
        <div className="brand__inset trust">
          <div className="trust__rule">
            <span className="trust__label">Relied on by teams that build</span>
          </div>
          <div className="marks" aria-label="Customer logos">
            <div className="marks__row">
              <span className="mark">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    d="M12 1.5c.6 5.2 3.3 7.9 8.5 8.5v0c-5.2.6-7.9 3.3-8.5 8.5c-.6-5.2-3.3-7.9-8.5-8.5c5.2-.6 7.9-3.3 8.5-8.5Z"
                    transform="translate(0 2)"
                  />
                </svg>
                Brisko
              </span>
              <span className="mark">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 13l8-7 8 7" />
                  <path d="M4 19l8-7 8 7" />
                </svg>
                Lantern
              </span>
              <span className="mark">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                  <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
                </svg>
                Velum
              </span>
              <span className="mark mark--word">orrick</span>
            </div>
            <div className="marks__row">
              <span className="mark">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 9c2.4-2.4 4.8-2.4 7.2 0s4.8 2.4 7.2 0 3.4-1.6 4.6-1.2" />
                  <path d="M2.5 16c2.4-2.4 4.8-2.4 7.2 0s4.8 2.4 7.2 0 3.4-1.6 4.6-1.2" />
                </svg>
                Tessa
              </span>
              <span className="mark">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="13" r="7" />
                  <circle cx="19.5" cy="4.5" r="2.5" fill="currentColor" stroke="none" />
                </svg>
                Quarra
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="brand__inset brand__bottom">
        <p className="legal">© 2026 Keylight, Inc. All rights reserved.</p>
      </div>
    </aside>
  );
}
