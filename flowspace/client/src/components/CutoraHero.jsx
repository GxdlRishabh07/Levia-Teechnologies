import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SLIDES = [
  {
    line1: 'Think at the Speed of Thought.',
    line2: 'Ship Without Friction.',
    sub: 'FlowSpace unites AI-powered natural language execution, real-time Kanban boards, and live multi-tenant sync so modern engineering teams turn ambitious ideas into shipped software effortlessly.',
  },
  {
    line1: 'Voice-Driven Execution.',
    line2: 'Zero Management Overhead.',
    sub: 'Speak or type in English or Hinglish — our intelligent Groq AI compiler breaks down features, assigns engineers, tags priorities, and updates your boards in milliseconds.',
  },
  {
    line1: 'Synchronized in Real Time.',
    line2: 'Engineered for Velocity.',
    sub: 'Live presence indicators, automated daily standup digests, and complete audit trails keep your entire organization laser-focused on shipping what truly moves the needle.',
  },
];

export default function CutoraHero({ backTo = '/', backLabel = '← Back to Workspace' }) {
  const [activeSlide, setActiveSlide] = useState(0);

  const current = SLIDES[activeSlide];

  return (
    <div className="cutora-hero">
      {/* Top bar: Brand + Back link */}
      <div className="cutora-topbar">
        <Link to="/" className="cutora-logo">
          {/* Professional Dark Tile with FlowSpace Geometric Flow Emblem */}
          <div className="cutora-logo-tile" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="flowspace-blue-mark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
              <rect width="24" height="24" rx="7" fill="#060A18" stroke="rgba(96, 165, 250, 0.35)" strokeWidth="1" />
              <path
                d="M6.5 8.25H17.5M6.5 12H14.5M6.5 15.75H11"
                stroke="url(#flowspace-blue-mark)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="16.5" cy="15.75" r="1.75" fill="#38BDF8" />
            </svg>
          </div>
          <span className="cutora-logo-title">FlowSpace</span>
        </Link>

        <Link to={backTo} className="cutora-back-link">
          {backLabel}
        </Link>
      </div>

      {/* Inspirational Pitch (Bottom Left): Headlines + Subline + Interactive Dots */}
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

        {/* Slider dots: 34.5x9u blue pill for active, 9u white dots at 55% */}
        <div className="cutora-dots cutora-enter-dots" role="tablist" aria-label="Product highlights">
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
