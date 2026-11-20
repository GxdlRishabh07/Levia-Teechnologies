import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const AUTOPLAY_INTERVAL = 5000;

export default function CutoraHero({ backTo = '/', backLabel = '← Back to Workspace' }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [direction, setDirection] = useState('next'); // 'next' | 'prev'
  const [isPaused, setIsPaused] = useState(false);
  const isScrollingRef = useRef(false);
  const touchStartYRef = useRef(0);

  const goToSlide = useCallback((nextIdx, explicitDir) => {
    setActiveSlide((current) => {
      if (nextIdx === current) return current;
      const computedDir = explicitDir || (nextIdx > current ? 'next' : 'prev');
      setDirection(computedDir);
      return nextIdx;
    });
  }, []);

  const nextSlide = useCallback(() => {
    setDirection('next');
    setActiveSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection('prev');
    setActiveSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Smooth Auto-scrolling Carousel: Cycles through all 3 titles continuously
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, activeSlide]);

  // Trackpad / Mouse Wheel Scroll over the text area: scroll up/down changes slide smoothly
  const handleWheel = (e) => {
    if (isScrollingRef.current) return;
    if (Math.abs(e.deltaY) > 25) {
      isScrollingRef.current = true;
      if (e.deltaY > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 650);
    }
  };

  // Mobile Touch Swipe support
  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    if (Math.abs(deltaY) > 35) {
      if (deltaY < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  // Keyboard navigation for dots
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevSlide();
    }
  };

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

      {/* Inspirational Pitch: Auto-scrolling Titles + Subline + Interactive Dots */}
      <div
        className="cutora-pitch"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-roledescription="carousel"
        aria-label="Product value propositions"
      >
        <div className="cutora-pitch-content" key={`slide-${activeSlide}`}>
          <div className="cutora-headline-clip">
            <h1
              className={`cutora-headline ${
                direction === 'next' ? 'cutora-scroll-in-up-1' : 'cutora-scroll-in-down-1'
              }`}
            >
              {current.line1}
            </h1>
          </div>
          <div className="cutora-headline-clip">
            <h2
              className={`cutora-headline ${
                direction === 'next' ? 'cutora-scroll-in-up-2' : 'cutora-scroll-in-down-2'
              }`}
            >
              {current.line2}
            </h2>
          </div>

          <p
            className={`cutora-subline ${
              direction === 'next' ? 'cutora-scroll-in-up-sub' : 'cutora-scroll-in-down-sub'
            }`}
          >
            {current.sub}
          </p>
        </div>

        {/* Slider dots: Active pill with smooth progress indicator + interactive navigation */}
        <div
          className="cutora-dots"
          role="tablist"
          aria-label="Product highlights"
          onKeyDown={handleKeyDown}
        >
          {SLIDES.map((slide, idx) => {
            const isActive = idx === activeSlide;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Slide ${idx + 1} of ${SLIDES.length}: ${slide.line1}`}
                onClick={() => goToSlide(idx)}
                className={`cutora-dot-btn ${isActive ? 'cutora-dot-active' : 'cutora-dot-inactive'} ${
                  isPaused ? 'is-paused' : ''
                }`}
              >
                {isActive && (
                  <span
                    className="cutora-dot-progress"
                    key={`progress-${activeSlide}`}
                    style={{ animationDuration: `${AUTOPLAY_INTERVAL}ms` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
