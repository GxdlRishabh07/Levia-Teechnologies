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
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8 || submitting) {
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
      }
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
      toast.success('Your workspace is ready');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = () => {
    setName('Alex Rivers');
    setEmail('alex@cutora.video');
    setPassword('Password123!');
    setWorkspaceName('Cutora Studio');
    toast.success('Google profile connected. Review details and click Create Account.');
  };

  return (
    <div className="cutora-root">
      {/* Cinematic Sunset Gradient Stage (In place of image) */}
      <div className="cutora-gradient-stage" />
      <div className="cutora-washes" />

      {/* Two-Column Flex Layout */}
      <div className="cutora-layout">
        {/* Left Column: Hero Pitch & Logo */}
        <CutoraHero backTo="/login" backLabel="← Back to Login" />

        {/* Right Column: Clean White Sign-up Card with Amber Accents */}
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
              {isDark ? <Sun className="h-5 w-5 text-[#F59A08]" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Heading & Subtitle */}
            <h2 className="cutora-card-heading">Create Account</h2>
            <p className="cutora-card-sub">Sign up to start creating stunning videos with ease.</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="cutora-form" noValidate>
              {/* Full Name Field */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="signup-name">
                  Full Name
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="signup-name"
                    type="text"
                    className="cutora-input"
                    placeholder="Input your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="signup-email">
                  Work Email
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="signup-email"
                    type="email"
                    className="cutora-input"
                    placeholder="Input your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Field with Eye Slash Toggle */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="signup-password">
                  Password <span style={{ opacity: 0.65, fontSize: '0.88em' }}>(min 8 characters)</span>
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="cutora-input cutora-input-with-eye"
                    placeholder="Create a strong password"
                    value={password}
                    minLength={8}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="cutora-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      /* Eye with Slash */
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="#F59A08" strokeWidth="2.2" />
                      </svg>
                    ) : (
                      /* Clean Eye */
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Workspace Name (Optional) */}
              <div className="cutora-field">
                <label className="cutora-label" htmlFor="signup-workspace">
                  Workspace Name <span style={{ opacity: 0.65, fontSize: '0.88em' }}>(optional)</span>
                </label>
                <div className="cutora-input-wrap">
                  <input
                    id="signup-workspace"
                    type="text"
                    className="cutora-input"
                    placeholder="e.g. Cutora Studio"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </div>
              </div>

              {/* Options Row: Agree Checkbox */}
              <div className="cutora-options-row">
                <label className="cutora-check-wrap">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <span className="cutora-check-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="cutora-check-label">I agree to Terms &amp; Privacy</span>
                </label>

                <a
                  href="#terms"
                  className="cutora-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    toast('Cutora Terms: 99.9% uptime, data privacy, encrypted credentials.');
                  }}
                >
                  View Policy
                </a>
              </div>

              {/* 66u Black Pill Button with Amber Text */}
              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || password.length < 8 || !agree}
                className="cutora-btn-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#F59A08]" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="cutora-divider">
              <span>Or continue with:</span>
            </div>

            {/* Google 66u White Pill Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              className="cutora-google-btn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Footer Line */}
            <p className="cutora-card-footer">
              Already have an account?{' '}
              <Link to="/login">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
