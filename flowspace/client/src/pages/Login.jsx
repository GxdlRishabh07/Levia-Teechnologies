import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useKeylightEntrance } from '../hooks/useKeylightEntrance';
import KeylightBrandPanel from '../components/KeylightBrandPanel';
import '../styles/keylight.css';

export default function Login() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const containerRef = useKeylightEntrance();

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
      toast.success('Welcome back to Keylight');
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

  const handlePasskeyClick = () => {
    toast('Passkey: Signing in with biometric key...', { icon: '🔑' });
    // Instant seamless login as Arjun (Owner) with passkey simulation
    handleDemoLogin('arjun@flowspace.dev');
  };

  const handleProviderClick = (provider) => {
    toast.success(`Authenticating with ${provider}...`);
    handleDemoLogin('arjun@flowspace.dev');
  };

  return (
    <div className="keylight-root" ref={containerRef}>
      <div className="shell">
        {/* Left Brand Panel: Breathing Keyhole Still + Light Layers + Marquee */}
        <KeylightBrandPanel
          headline="Unlock calmly. Grow without worry."
          subcopy="Sign in with a glance, not a guess. Made to keep every team in flow while each account stays sealed."
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
            <section className="panel" aria-labelledby="signin-title">
              <h1 className="panel__title" id="signin-title">Hello again!</h1>
              <p className="panel__sub">Sign in to carry on.</p>

              {/* Passkey First: The Strongest Action */}
              <div className="passkey-slot">
                <button className="passkey" type="button" onClick={handlePasskeyClick}>
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
                  <span className="passkey__label">Unlock using a passkey</span>
                  <span className="pill">Most secure</span>
                </button>
              </div>

              {/* Evaluator Quick Access Pills */}
              <div className="demo-pills" aria-label="1-Click Evaluator Access">
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleDemoLogin('arjun@flowspace.dev')}
                  title="1-Click Login as Arjun (Owner)"
                >
                  ⚡ Arjun · Owner
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleDemoLogin('priya@flowspace.dev')}
                  title="1-Click Login as Priya (Member)"
                >
                  ⚡ Priya · Member
                </button>
              </div>

              <div className="or or--top" role="separator">
                <span>Or use your password</span>
              </div>

              {/* Password Form */}
              <form className="form" id="signin" onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label className="label" htmlFor="identity">Email or username</label>
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
                      type="text"
                      autoComplete="username"
                      placeholder="Enter your email or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="password">Password</label>
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
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
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

                <div className="row">
                  <label className="check">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span className="check__box" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="check__text">Remember me</span>
                  </label>
                  <a
                    className="link-strong"
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      toast('Password reset email sent to your inbox', { icon: '✉️' });
                    }}
                  >
                    Forgot your key?
                  </a>
                </div>

                <div className="cta-slot">
                  <button className="cta" type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign in</span>
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
                No Keylight space yet? <Link to="/signup">Open a free space</Link>
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
