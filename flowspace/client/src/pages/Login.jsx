import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import CutoraHero from '../components/CutoraHero';
import '../styles/cutora.css';

export default function Login() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const performLogin = async (loginEmail, loginPassword) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await login({ email: loginEmail, password: loginPassword });
      toast.success('Welcome back to FlowSpace');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    performLogin(email.trim(), password);
  };

  const handleDemoLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    performLogin(demoEmail, 'Demo@1234');
  };

  return (
    <div className="cutora-root">
      {/* Cinematic Deep Blue Gradient Stage */}
      <div className="cutora-gradient-stage" />
      <div className="cutora-washes" />

      {/* Two-Column Flex Layout */}
      <div className="cutora-layout">
        {/* Left Column: Hero Pitch & Logo */}
        <CutoraHero backTo="/" backLabel="← Back to Workspace" />

        {/* Right Column: Clean White Log-in Card with Blue Accents */}
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
            <h2 className="cutora-card-heading">Welcome Back!</h2>
            <p className="cutora-card-sub">Sign in to access your projects and collaborate live with your team.</p>

            {/* Evaluator Quick-Access Demo Pills */}
            <div className="cutora-demo-row">
              <button
                type="button"
                className="cutora-demo-pill"
                onClick={() => handleDemoLogin('arjun@flowspace.dev')}
                title="1-Click Login as Arjun (Owner)"
              >
                <Zap className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                <span>Arjun · Owner</span>
              </button>
              <button
                type="button"
                className="cutora-demo-pill"
                onClick={() => handleDemoLogin('priya@flowspace.dev')}
                title="1-Click Login as Priya (Member)"
              >
                <Zap className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                <span>Priya · Member</span>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="cutora-form">
              {/* Email */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="cutora-login-email">
                  Work Email
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="cutora-login-email"
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
                <label className="cutora-label" htmlFor="cutora-login-password">
                  Password
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="cutora-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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

              {/* Remember Me & Forgot Password */}
              <div className="cutora-options-row">
                <label className="cutora-check-wrap">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="cutora-check-box" aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
                      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="cutora-check-label">Remember Me</span>
                </label>

                <a href="#forgot" onClick={(e) => { e.preventDefault(); toast('Password reset link sent to registered email'); }} className="cutora-forgot-link">
                  Forgot Password?
                </a>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="cutora-btn-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In to FlowSpace</span>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="cutora-card-footer">
              Don’t have an account?{' '}
              <Link to="/signup">Sign up for free</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
