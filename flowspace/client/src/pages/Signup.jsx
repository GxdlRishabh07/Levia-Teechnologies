import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useKeylightEntrance } from '../hooks/useKeylightEntrance';
import KeylightBrandPanel from '../components/KeylightBrandPanel';
import '../styles/keylight.css';

export default function Signup() {
  const { signup } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const containerRef = useKeylightEntrance();

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
      toast.success('Your Keylight workspace is ready');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProviderClick = (provider) => {
    toast.success(`Setting up workspace with ${provider}...`);
    // Pre-populate demo credentials
    setName('Alex Rivers');
    setEmail('alex@keylight.space');
    setPassword('Password123!');
    setWorkspaceName('Keylight Engineering');
  };

  return (
    <div className="keylight-root" ref={containerRef}>
      <div className="shell">
        {/* Left Brand Panel: Breathing Keyhole Still + Light Layers + Marquee */}
        <KeylightBrandPanel
          headline="Unlock calmly. Start in flow."
          subcopy="Give your team an open, sealed workspace from day one. Scale confidently with zero credential friction."
        />

        {/* Right Auth Panel */}
        <main className="auth">
          {/* Subtle Top Actions (Theme Toggle) */}
          <div className="auth__top-actions">
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-[8px] text-[#4a4d54] dark:text-[#9ca3af] hover:text-[#030712] dark:hover:text-[#f9fafb] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4 text-[#FBBF24]" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <div className="auth__main">
            <section className="panel" aria-labelledby="signup-title">
              <h1 className="panel__title" id="signup-title">Create your space</h1>
              <p className="panel__sub">Start building in flow with your team.</p>

              {/* Passkey / Fast Setup Option */}
              <div className="passkey-slot">
                <button
                  className="passkey"
                  type="button"
                  onClick={() => handleProviderClick('Passkey')}
                >
                  <svg
                    className="passkey__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                    <path d="M2 12a10 10 0 0 1 18-6" />
                    <path d="M2 16h.01" />
                    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                  </svg>
                  <span className="passkey__label">Enroll with passkey</span>
                  <span className="pill">Instant setup</span>
                </button>
              </div>

              <div className="or or--top" role="separator">
                <span>Or register with email</span>
              </div>

              {/* Signup Form */}
              <form className="form" id="signup" onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label className="label" htmlFor="name">Full name</label>
                  <div className="control">
                    <svg
                      className="control__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      className="input"
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Alex Rivers"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="identity">Work email</label>
                  <div className="control">
                    <svg
                      className="control__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      className="input"
                      id="identity"
                      name="identity"
                      type="email"
                      autoComplete="email"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="password">
                    Password <span style={{ opacity: 0.6, fontSize: '0.85em' }}>(min 8 characters)</span>
                  </label>
                  <div className="control">
                    <svg
                      className="control__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      className="input"
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      minLength={8}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      className="reveal"
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      aria-controls="password"
                    >
                      {showPassword ? (
                        <svg
                          className="eye-off"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <path d="m2 2 20 20" />
                        </svg>
                      ) : (
                        <svg
                          className="eye-open"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="workspace">Workspace name (optional)</label>
                  <div className="control">
                    <svg
                      className="control__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
                      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
                    </svg>
                    <input
                      className="input"
                      id="workspace"
                      name="workspace"
                      type="text"
                      placeholder="e.g. Acme Studio"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row">
                  <label className="check">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span className="check__box" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="check__text">Agree to terms &amp; privacy</span>
                  </label>
                  <a
                    className="link-strong"
                    href="#terms"
                    onClick={(e) => {
                      e.preventDefault();
                      toast('Keylight terms: 99.9% uptime, zero lock-in, encrypted data.');
                    }}
                  >
                    View policy
                  </a>
                </div>

                <div className="cta-slot">
                  <button
                    className="cta"
                    type="submit"
                    disabled={submitting || !name.trim() || !email.trim() || password.length < 8 || !agree}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Opening space...</span>
                      </>
                    ) : (
                      <span>Open a free space</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="or" role="separator">
                <span>Or continue with</span>
              </div>

              <div className="providers">
                <button
                  className="provider"
                  type="button"
                  onClick={() => handleProviderClick('Google')}
                >
                  <svg
                    className="provider__mark"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="m10 17 5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <button
                  className="provider"
                  type="button"
                  onClick={() => handleProviderClick('Apple')}
                >
                  <svg
                    className="provider__mark"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="m10 17 5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  <span>Continue with Apple</span>
                </button>
                <button
                  className="provider"
                  type="button"
                  onClick={() => handleProviderClick('GitHub')}
                >
                  <svg
                    className="provider__mark"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="m10 17 5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>
              </div>

              <p className="switch">
                Already have a space? <Link to="/login">Sign in</Link>
              </p>
            </section>
          </div>

          <nav className="auth__foot" aria-label="Legal">
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#support" onClick={(e) => e.preventDefault()}>Support</a>
          </nav>
        </main>
      </div>
    </div>
  );
}
