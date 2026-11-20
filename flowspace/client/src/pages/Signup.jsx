import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { GlassAmbientCanvas } from '../App';
import { FlowSpaceLogo } from '../components/LinearIcons';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8 || submitting) return;

    setSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        workspaceName: workspaceName.trim() || undefined,
      });
      toast.success('Workspace created and ready');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
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
          <Link to="/login" className="btn-secondary !py-2 !px-3.5 !text-[13.5px] no-underline">
            Sign in
          </Link>
        </div>
      </header>

      {/* Centered Frosted Glass Auth Canvas */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[440px] space-y-5">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <FlowSpaceLogo size={32} />
            </div>
            <h1 className="type-headline m-0 text-[#111216]">Create your workspace</h1>
            <p className="type-body-sm text-[#111216]/60 m-0">
              Start an isolated multi-tenant team workspace in seconds.
            </p>
          </div>

          <div className="linear-panel p-6 sm:p-[26px]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-[13.5px] font-semibold text-[#111216]/85 mb-1.5"
                >
                  Full name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Arjun Mehta"
                  className="linear-input !bg-white/85"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-[13.5px] font-semibold text-[#111216]/85 mb-1.5"
                >
                  Work email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun@company.com"
                  className="linear-input !bg-white/85"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signup-password"
                    className="block text-[13.5px] font-semibold text-[#111216]/85"
                  >
                    Password
                  </label>
                  <span className="text-[12.5px] text-[#111216]/45">Min 8 characters</span>
                </div>
                <input
                  id="signup-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="linear-input !bg-white/85"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signup-workspace"
                    className="block text-[13.5px] font-semibold text-[#111216]/85"
                  >
                    Team workspace name
                  </label>
                  <span className="text-[12.5px] text-[#111216]/45">Optional</span>
                </div>
                <input
                  id="signup-workspace"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g., Levia Product Engineering"
                  className="linear-input !bg-white/85"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !name.trim() || !email.trim() || password.length < 8}
                className="btn-primary w-full !py-2.5 mt-2"
              >
                <span>{submitting ? 'Creating workspace...' : 'Create workspace'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-[14px] text-[#111216]/60 m-0">
            Already have a FlowSpace account?{' '}
            <Link
              to="/login"
              className="text-[#6531F7] hover:text-[#5524DF] font-semibold transition-colors no-underline"
            >
              Sign in instead
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
