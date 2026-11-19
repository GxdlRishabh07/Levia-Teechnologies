import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { FlowSpaceLogo } from '../components/LinearIcons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const performLogin = async (loginEmail, loginPassword) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await login({ email: loginEmail, password: loginPassword });
      toast.success('Welcome to FlowSpace');
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
    <div className="min-h-screen flex flex-col bg-[#010102] text-[#f7f8f8]">
      {/* 56px Minimal Linear Top Nav */}
      <header className="h-[56px] border-b border-[#23252a] bg-[#010102] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FlowSpaceLogo size={22} />
          <span className="text-[15.5px] font-semibold tracking-[-0.2px] text-[#f7f8f8]">
            FlowSpace
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[14px] text-[#8a8f98]">
            AI-Native Team Task Workspace
          </span>
          <Link to="/signup" className="btn-secondary !py-2 !px-3.5 !text-[14px] no-underline">
            Create account
          </Link>
        </div>
      </header>

      {/* Centered Linear Auth Canvas */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Brand & Headline */}
          <div className="text-center space-y-2.5">
            <div className="flex justify-center mb-3">
              <FlowSpaceLogo size={32} />
            </div>
            <h1 className="type-headline m-0 text-[#f7f8f8]">Sign in to FlowSpace</h1>
            <p className="type-body text-[#8a8f98] m-0">
              Speak or type plain English &amp; Hinglish. Boards sync live across your team.
            </p>
          </div>

          {/* Charcoal Surface-1 Panel */}
          <div className="linear-panel p-[30px] space-y-5">
            {/* 1-Click Evaluator Quick Access */}
            <div className="rounded-[8px] bg-[#141516] border border-[#23252a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="type-eyebrow text-[#8a8f98]">Evaluator Quick Access</span>
                <span className="type-caption text-[#62666d]">1-click sign in</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('arjun@flowspace.dev')}
                  className="btn-inverse w-full !py-2.5 !px-3.5 !text-[14px]"
                >
                  <span>Arjun · Owner</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('priya@flowspace.dev')}
                  className="btn-secondary w-full !py-2.5 !px-3.5 !text-[14px]"
                >
                  <span>Priya · Member</span>
                </button>
              </div>

              <p className="type-caption text-[#62666d] m-0 leading-[1.5]">
                Open two windows as Arjun &amp; Priya to watch live Pusher Kanban sync.
              </p>
            </div>

            {/* Hairline Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#23252a]" />
              <span className="type-caption text-[#62666d]">or sign in with email</span>
              <div className="h-px flex-1 bg-[#23252a]" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[14px] font-semibold text-[#d0d6e0] mb-1.5"
                >
                  Work email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun@flowspace.dev"
                  className="linear-input"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[14px] font-semibold text-[#d0d6e0] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="linear-input"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="btn-primary w-full !py-2.5 mt-1"
              >
                <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-[14.5px] text-[#8a8f98] m-0">
            New to FlowSpace?{' '}
            <Link
              to="/signup"
              className="text-[#f7f8f8] hover:text-[#828fff] font-medium transition-colors no-underline"
            >
              Create a new workspace
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
