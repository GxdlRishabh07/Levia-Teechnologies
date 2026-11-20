import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import CutoraHero from '../components/CutoraHero';
import '../styles/cutora.css';

export default function Signup() {
  const { signup } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [agree, setAgree] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) {
      toast.error('Please accept the Terms of Service to continue');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    setSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        workspaceName: workspaceName.trim() || undefined,
      });
      toast.success('Workspace created successfully!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to create workspace account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cutora-root">
      {/* Cinematic Deep Blue Gradient Stage */}
      <div className="cutora-gradient-stage" />
      <div className="cutora-washes" />

      {/* Two-Column Flex Layout */}
      <div className="cutora-layout">
        {/* Left Column: Hero Pitch & Logo */}
        <CutoraHero backTo="/login" backLabel="← Back to Login" />

        {/* Right Column: Clean White Sign-up Card with Blue Accents */}
        <div className="cutora-card-wrap">
          <div className="cutora-card cutora-enter-card">
            {/* Theme Toggle Button in Card Corner */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="cutora-theme-toggle"
            >
              {isDark ? <Sun className="h-5 w-5 text-[#60A5FA]" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Heading & Subtitle */}
            <h2 className="cutora-card-heading">Create Workspace</h2>
            <p className="cutora-card-sub">Join engineering teams building with real-time AI velocity.</p>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="cutora-form">
              {/* Full Name */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="cutora-signup-name">
                  Full Name
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="cutora-signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    autoComplete="name"
                    className="cutora-input"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="cutora-signup-email">
                  Work Email
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="cutora-signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    className="cutora-input"
                  />
                </div>
              </div>

              {/* Password with Eye Slash Toggle */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="cutora-signup-password">
                  Password (min 8 characters)
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="cutora-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="cutora-input cutora-input-with-eye"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cutora-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      /* Eye Off SVG */
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeWidth="1.8" />
                      </svg>
                    ) : (
                      /* Eye SVG */
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Workspace Name (Optional) */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="cutora-signup-workspace">
                  Workspace Name <span className="text-xs text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="cutora-signup-workspace"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Core Engineering"
                    className="cutora-input"
                  />
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="cutora-options-row">
                <label className="cutora-check-wrap">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <span className="cutora-check-box" aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="cutora-check-label">I agree to Terms & Privacy</span>
                </label>

                <a href="#privacy" onClick={(e) => { e.preventDefault(); toast('FlowSpace is committed to end-to-end data isolation and privacy'); }} className="cutora-forgot-link">
                  View Policy
                </a>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || password.length < 8 || !agree}
                className="cutora-btn-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating workspace…</span>
                  </>
                ) : (
                  <span>Create Workspace Account</span>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="cutora-card-footer">
              Already have an account?{' '}
              <Link to="/login">Sign in here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
