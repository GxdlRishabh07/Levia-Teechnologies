import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { GlassAmbientCanvas } from '../App';
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
    <div className="relative min-h-screen flex flex-col bg-[#FFFFFF] text-[#111216] p-3">
      <GlassAmbientCanvas />

      {/* Floating Frosted Glass Top Nav */}
      <header className="relative z-10 h-[56px] linear-panel !rounded-[18px] px-5 flex items-center justify-between max-w-[1440px] w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <FlowSpaceLogo size={24} />
          <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-[#111216]">
            FlowSpace
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-[13.5px] font-medium text-[#111216]/55">
            AI-Native Team Task Workspace
          </span>
          <Link to="/signup" className="btn-secondary !py-2 !px-3.5 !text-[13.5px] no-underline">
            Create account
          </Link>
        </div>
      </header>

      {/* Centered Frosted Glass Auth Canvas */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[440px] space-y-5">
          {/* Brand & Headline */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <FlowSpaceLogo size={32} />
            </div>
            <h1 className="type-headline m-0 text-[#111216]">Sign in to FlowSpace</h1>
            <p className="type-body-sm text-[#111216]/60 m-0">
              Speak or type plain English &amp; Hinglish. Boards sync live across your team.
            </p>
          </div>

          {/* Frosted Glass Surface Panel */}
          <div className="linear-panel p-6 sm:p-[26px] space-y-4">
            {/* 1-Click Evaluator Quick Access */}
            <div className="rounded-[14px] bg-white/65 border border-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="type-eyebrow !text-[#6531F7]">Evaluator Quick Access</span>
                <span className="type-caption text-[#111216]/45">1-click sign in</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('arjun@flowspace.dev')}
                  className="btn-inverse w-full !py-2.5 !px-3.5 !text-[13.5px]"
                >
                  <span>Arjun · Owner</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('priya@flowspace.dev')}
                  className="btn-secondary w-full !py-2.5 !px-3.5 !text-[13.5px]"
                >
                  <span>Priya · Member</span>
                </button>
              </div>

              <p className="type-caption text-[#111216]/50 m-0 leading-[1.5]">
                Open two windows as Arjun &amp; Priya to watch live Pusher Kanban sync.
              </p>
            </div>

            {/* Hairline Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#111216]/10" />
              <span className="type-caption text-[#111216]/45">or sign in with email</span>
              <div className="h-px flex-1 bg-[#111216]/10" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[13.5px] font-semibold text-[#111216]/85 mb-1.5"
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
                  className="linear-input !bg-white/85"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[13.5px] font-semibold text-[#111216]/85 mb-1.5"
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
                  className="linear-input !bg-white/85"
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

          <p className="text-center text-[14px] text-[#111216]/60 m-0">
            New to FlowSpace?{' '}
            <Link
              to="/signup"
              className="text-[#6531F7] hover:text-[#5524DF] font-semibold transition-colors no-underline"
            >
              Create a new workspace
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
