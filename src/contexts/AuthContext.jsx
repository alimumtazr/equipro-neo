import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getStoredUserId, setStoredUserId } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const stored = getStoredUserId();
    if (!stored) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
      setError(null);
    } catch (err) {
      setStoredUserId(null);
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginAs = useCallback(async (userId) => {
    setStoredUserId(userId);
    setLoading(true);
    await refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    setStoredUserId(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, loginAs, logout, refresh }),
    [user, loading, error, loginAs, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
