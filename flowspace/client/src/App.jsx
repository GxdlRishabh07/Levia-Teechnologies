import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
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

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#010102]">
        <div className="flex items-center gap-3">
          <FlowSpaceLogo size={20} />
          <span className="text-[13.5px] font-medium text-[#8a8f98] tracking-[-0.05px]">
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
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3200,
            style: {
              background: '#141516',
              color: '#f7f8f8',
              border: '1px solid #34343a',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            },
            success: {
              iconTheme: {
                primary: '#27a644',
                secondary: '#0f1011',
              },
            },
            error: {
              iconTheme: {
                primary: '#e5484d',
                secondary: '#0f1011',
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
