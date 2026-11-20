import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SLIDES = [
  {
    line1: 'Edit Smarter. Export Faster.',
    line2: 'Create Anywhere.',
    sub: 'From quick social media clips to full-length videos, our powerful editor lets you work seamlessly across devices.',
  },
  {
    line1: 'Timeline in Flow. Zero Friction.',
    line2: 'Build Together.',
    sub: 'Instant multi-agent collaboration and realtime boards keep your entire team aligned on every release.',
  },
  {
    line1: 'High Performance. Golden Quality.',
    line2: 'One Click Polish.',
    sub: 'Ultra-fast rendering and clean workflows designed for modern builders who refuse to compromise.',
  },
];

export default function CutoraHero({ backTo = '/', backLabel = '← Back to Website' }) {
  const [activeSlide, setActiveSlide] = useState(0);

  const current = SLIDES[activeSlide];

  return (
    <div className="cutora-hero">
      {/* Top bar: 57u from top, 92.5u from left */}
      <div className="cutora-topbar">
        <Link to="/" className="cutora-logo">
          {/* 48u Black tile holding thick amber-gradient "C" */}
          <div className="cutora-logo-tile" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <defs>
                <linearGradient id="cutora-c-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFC233" />
                  <stop offset="100%" stopColor="#F58A07" />
                </linearGradient>
              </defs>
              <path
                d="M19.5 8.5C18.2 6.9 16.2 6 14 6C9.58 6 6 9.58 6 14C6 18.42 9.58 22 14 22C16.2 22 18.2 21.1 19.5 19.5"
                stroke="url(#cutora-c-grad)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="cutora-logo-title">Cutora</span>
        </Link>

        <Link to={backTo} className="cutora-back-link">
          {backLabel}
        </Link>
      </div>

      {/* Pitch (Bottom Left): Headline + Subline + Interactive Dots */}
      <div className="cutora-pitch">
        <div className="cutora-headline-clip">
          <h1 key={`l1-${activeSlide}`} className="cutora-headline cutora-enter-wipe-1">
            {current.line1}
          </h1>
        </div>
        <div className="cutora-headline-clip">
          <h2 key={`l2-${activeSlide}`} className="cutora-headline cutora-enter-wipe-2">
            {current.line2}
          </h2>
        </div>

        <p key={`sub-${activeSlide}`} className="cutora-subline cutora-enter-sub">
          {current.sub}
        </p>

        {/* Slider dots: 34.5x9u amber pill for active, 9u white dots at 55% */}
        <div className="cutora-dots cutora-enter-dots" role="tablist" aria-label="Pitch highlights">
          {SLIDES.map((_, idx) => {
            const isActive = idx === activeSlide;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setActiveSlide(idx)}
                className={`cutora-dot-btn ${isActive ? 'cutora-dot-active' : 'cutora-dot-inactive'}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
