import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { socket } from '../src/socket/socket.jsx';

const AuthContext = createContext(null);
const API = '/api/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/me`, { credentials: 'include' })
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (r.ok && data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // จบเกมแล้ว server บวก exp ให้ใน DB — รับค่าใหม่มาอัปเดตแถบทันที ไม่ต้องรีโหลดหน้า
  useEffect(() => {
    const onProgress = ({ level, exp, expNeeded, gamesPlayed }) => {
      setUser(prev => (prev ? { ...prev, level, exp, expNeeded, gamesPlayed } : prev));
    };

    socket.on('player:progress', onProgress);
    return () => socket.off('player:progress', onProgress);
  }, []);

  const register = useCallback(async ({ username, password }) => {
    const res = await fetch(`${API}/register`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Register failed.');
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async ({ username, password }) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Login failed.');
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload = {}) => {
    const form = new FormData();
    if (payload.username !== undefined) form.append('username', payload.username);
    if (payload.displayName !== undefined) form.append('displayName', payload.displayName);
    if (payload.birthdate !== undefined) form.append('birthdate', payload.birthdate);
    if (payload.email !== undefined) form.append('email', payload.email);
    if (payload.avatarFile) form.append('avatar', payload.avatarFile);

    const res = await fetch(`${API}/profile`, {
      method: 'PUT',
      credentials: 'include',
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Update profile failed.');
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}