import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);
const ACTIVE_WORKSPACE_STORAGE_KEY = 'flowspace_active_wid';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(() => {
    const saved = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    return saved ? Number(saved) : null;
  });
  const [realtimeConfig, setRealtimeConfig] = useState({
    enabled: false,
    key: null,
    cluster: 'ap2',
  });
  const [isLoading, setIsLoading] = useState(true);

  const syncWorkspaceState = useCallback((wsList, preferredId) => {
    const list = Array.isArray(wsList) ? wsList : [];
    setWorkspaces(list);

    const savedId = Number(localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY));
    const validSaved = list.find((w) => Number(w.id) === savedId);
    const validPreferred = list.find((w) => Number(w.id) === Number(preferredId));
    const resolvedId = validSaved?.id || validPreferred?.id || list[0]?.id || null;

    setActiveWorkspaceIdState(resolvedId ? Number(resolvedId) : null);
    if (resolvedId) {
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, String(resolvedId));
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const setActiveWorkspaceId = useCallback((id) => {
    const numericId = id ? Number(id) : null;
    setActiveWorkspaceIdState(numericId);
    if (numericId) {
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, String(numericId));
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user || null);
      syncWorkspaceState(data.workspaces, data.activeWorkspaceId);
      if (data.realtime) {
        setRealtimeConfig(data.realtime);
      }
      return data;
    } catch {
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [syncWorkspaceState]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(
    async ({ email, password }) => {
      const data = await api.post('/auth/login', { email, password });
      setUser(data.user);
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      syncWorkspaceState(data.workspaces, data.activeWorkspaceId);
      // Fetch /auth/me in background to pick up realtime config
      api
        .get('/auth/me')
        .then((me) => {
          if (me?.realtime) setRealtimeConfig(me.realtime);
        })
        .catch(() => {});
      return data;
    },
    [syncWorkspaceState]
  );

  const signup = useCallback(
    async ({ name, email, password, workspaceName }) => {
      const data = await api.post('/auth/signup', {
        name,
        email,
        password,
        workspaceName: workspaceName || undefined,
      });
      setUser(data.user);
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      syncWorkspaceState(data.workspaces, data.activeWorkspaceId);
      api
        .get('/auth/me')
        .then((me) => {
          if (me?.realtime) setRealtimeConfig(me.realtime);
        })
        .catch(() => {});
      return data;
    },
    [syncWorkspaceState]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout error
    }
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceIdState(null);
    localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  }, []);

  const createWorkspace = useCallback(async (name) => {
    const data = await api.post('/workspaces', { name });
    if (data?.workspace) {
      setWorkspaces((prev) => [...prev, data.workspace]);
      setActiveWorkspaceId(data.workspace.id);
    }
    return data?.workspace;
  }, [setActiveWorkspaceId]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => Number(w.id) === Number(activeWorkspaceId)) || workspaces[0] || null,
    [workspaces, activeWorkspaceId]
  );

  const value = useMemo(
    () => ({
      user,
      workspaces,
      activeWorkspace,
      activeWorkspaceId: activeWorkspace?.id || activeWorkspaceId,
      setActiveWorkspaceId,
      realtimeConfig,
      login,
      signup,
      logout,
      refreshAuth,
      createWorkspace,
      isLoading,
    }),
    [
      user,
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      setActiveWorkspaceId,
      realtimeConfig,
      login,
      signup,
      logout,
      refreshAuth,
      createWorkspace,
      isLoading,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
