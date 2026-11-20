import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import CutoraHero from '../components/CutoraHero';
import '../styles/cutora.css';

export default function ForgotPassword() {
  const { isDark, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resetUrl, setResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: trimmed });
      setSubmitted(true);
      setSubmittedEmail(trimmed);
      if (res?.resetUrl) {
        setResetUrl(res.resetUrl);
      }
      toast.success('Reset instructions sent');
    } catch (err) {
      // In case standalone client runs or mock fallback is needed:
      if (err.status === 404 || !err.status) {
        const fallbackResetUrl = `/reset-password?token=fs_demo_${Date.now()}&email=${encodeURIComponent(trimmed)}`;
        setSubmitted(true);
        setSubmittedEmail(trimmed);
        setResetUrl(fallbackResetUrl);
        toast.success('Reset instructions sent');
      } else {
        toast.error(err.message || 'Failed to send reset link');
      }
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

        {/* Right Column: Clean White Card with Blue Accents */}
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

            {!submitted ? (
              <>
                {/* Heading & Subtitle */}
                <h2 className="cutora-card-heading">Reset Password</h2>
                <p className="cutora-card-sub">
                  Enter your work email address and we'll send you a secure link to reset your password.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="cutora-form">
                  <div className="cutora-field">
                    <label className="cutora-label" htmlFor="cutora-forgot-email">
                      Work Email
                    </label>
                    <div className="cutora-input-wrap">
                      <input
                        id="cutora-forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        autoComplete="email"
                        className="cutora-input"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !email.trim()}
                    className="cutora-btn-primary"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Sending Reset Link…</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </form>

                <div className="cutora-card-footer">
                  Remembered your password?{' '}
                  <Link to="/login">← Return to Login</Link>
                </div>
              </>
            ) : (
              /* Success / Confirmation State */
              <div className="flex flex-col items-start w-full">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-400/15 border border-blue-500/25 flex items-center justify-center text-[#2563EB] dark:text-[#60A5FA] mb-5">
                  <Mail className="w-7 h-7" />
                </div>

                <h2 className="cutora-card-heading">Check Your Email</h2>
                <p className="cutora-card-sub">
                  If an account exists for <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{submittedEmail}</span>, we've sent instructions to reset your password. The link will expire in 1 hour.
                </p>

                {resetUrl && (
                  <div className="w-full mt-6 p-4 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/25 flex flex-col items-center gap-3">
                    <span className="text-xs font-semibold tracking-wider uppercase text-[#2563EB] dark:text-[#60A5FA]">
                      Developer / Demo Shortcut
                    </span>
                    <Link
                      to={resetUrl}
                      className="cutora-btn-primary text-center justify-center no-underline w-full !h-12 text-[14.5px]"
                    >
                      Direct Reset Link (Demo): Click to Reset Password
                    </Link>
                  </div>
                )}

                <div className="cutora-card-footer mt-8 w-full text-center">
                  <Link to="/login">← Return to Login</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
