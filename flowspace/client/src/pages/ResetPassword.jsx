import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sun, Moon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import CutoraHero from '../components/CutoraHero';
import '../styles/cutora.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const { isDark, toggleTheme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
      });
      setSuccess(true);
      toast.success('Password updated successfully!');
    } catch (err) {
      if (token.startsWith('fs_demo_')) {
        setSuccess(true);
        toast.success('Password updated successfully (Demo Mode)!');
      } else {
        toast.error(err.message || 'Failed to update password');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasToken = Boolean(token && token.trim());

  return (
    <div className="cutora-root">
      {/* Cinematic Deep Blue Gradient Stage */}
      <div className="cutora-gradient-stage" />
      <div className="cutora-washes" />

      {/* Two-Column Flex Layout */}
      <div className="cutora-layout">
        {/* Left Column: Hero Pitch & Logo */}
        <CutoraHero backTo="/login" backLabel="← Back to Login" />

        {/* Right Column: Card Wrap */}
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

            {!hasToken ? (
              /* Missing or Invalid Token State */
              <div className="flex flex-col items-start w-full">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 dark:bg-rose-400/15 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h2 className="cutora-card-heading">Invalid Reset Link</h2>
                <p className="cutora-card-sub">
                  Invalid Reset Link. This password reset link is missing a valid security token.
                </p>
                <Link
                  to="/forgot-password"
                  className="cutora-btn-primary mt-6 text-center justify-center no-underline w-full"
                >
                  Request New Reset Link
                </Link>
                <div className="cutora-card-footer mt-6 w-full text-center">
                  <Link to="/login">← Return to Login</Link>
                </div>
              </div>
            ) : success ? (
              /* Success State */
              <div className="flex flex-col items-start w-full">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h2 className="cutora-card-heading">Password Updated!</h2>
                <p className="cutora-card-sub">
                  Your password has been changed successfully. You can now sign in with your new credentials.
                </p>
                <Link
                  to="/login"
                  className="cutora-btn-primary mt-6 text-center justify-center no-underline w-full"
                >
                  Sign In to FlowSpace
                </Link>
              </div>
            ) : (
              /* Reset Password Form */
              <>
                <h2 className="cutora-card-heading">Set New Password</h2>
                <p className="cutora-card-sub">
                  Enter and confirm your new password below.
                  {email ? (
                    <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Account: {email}
                    </span>
                  ) : null}
                </p>

                <form onSubmit={handleSubmit} className="cutora-form">
                  {/* New Password */}
                  <div className="cutora-field">
                    <label className="cutora-label" htmlFor="cutora-new-password">
                      New Password
                    </label>
                    <div className="cutora-input-wrap">
                      <input
                        id="cutora-new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
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
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeWidth="1.8" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="cutora-field">
                    <label className="cutora-label" htmlFor="cutora-confirm-password">
                      Confirm New Password
                    </label>
                    <div className="cutora-input-wrap">
                      <input
                        id="cutora-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        autoComplete="new-password"
                        className="cutora-input cutora-input-with-eye"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="cutora-eye-btn"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeWidth="1.8" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !password || !confirmPassword}
                    className="cutora-btn-primary"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Updating Password…</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </form>

                <div className="cutora-card-footer">
                  <Link to="/login">← Return to Login</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
