import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { FlowSpaceLogo } from './components/LinearIcons';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Workspace from './pages/Workspace';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function GlassAmbientCanvas() {
  return (
    <div className="glass-ambient-bg" aria-hidden="true">
      <div className="glass-ambient-top-sky" />
      <div className="glass-ambient-left-orchid" />
      <div className="glass-ambient-right-indigo" />
      <div className="glass-ambient-bottom-sheen" />
    </div>
  );
}

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3200,
        style: isDark
          ? {
              background: 'rgba(20, 22, 36, 0.88)',
              backdropFilter: 'blur(24px) saturate(165%)',
              WebkitBackdropFilter: 'blur(24px) saturate(165%)',
              color: '#F5F6FA',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '14px',
              padding: '10px 14px',
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '13.5px',
              fontWeight: 500,
              boxShadow:
                'inset 1.5px 1.5px 2px rgba(255,255,255,0.14), 0 14px 36px rgba(0,0,0,0.5)',
            }
          : {
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              color: '#111216',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              borderRadius: '14px',
              padding: '10px 14px',
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '13.5px',
              fontWeight: 500,
              boxShadow:
                'inset 2px 2px 3px rgba(255,255,255,0.85), 0 12px 32px rgba(31,28,70,0.08)',
            },
        success: {
          iconTheme: {
            primary: '#059669',
            secondary: '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: '#E11D48',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  );
}

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#FFFFFF] dark:bg-[#02040A] text-[#111216] dark:text-[#F5F6FA]">
        <GlassAmbientCanvas />
        <div className="relative z-10 linear-panel px-5 py-3.5 flex items-center gap-3">
          <FlowSpaceLogo size={22} />
          <span className="text-[14px] font-medium text-[#111216]/70 dark:text-[#F5F6FA]/75 tracking-[-0.01em]">
            Initializing workspace…
          </span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Workspace />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
          <ThemedToaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
