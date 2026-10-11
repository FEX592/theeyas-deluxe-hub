import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, BootstrapState } from '../types.ts';
import { api } from '../lib/api.ts';

interface AuthContextType {
  profile: Profile | null;
  bootstrapState: BootstrapState | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  signup: (email: string, displayName: string, password: string) => Promise<{ profile: Profile; firstAccount: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null, bootstrapState: null, isLoading: true, isAdmin: false, isOwner: false,
  login: async () => { throw new Error('Authentication is not ready.'); },
  signup: async () => { throw new Error('Authentication is not ready.'); },
  logout: async () => {}, refresh: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bootstrapState, setBootstrapState] = useState<BootstrapState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const [bStatus, session] = await Promise.all([api.getBootstrapStatus(), api.getMe()]);
      setBootstrapState(bStatus);
      setProfile(session.profile || null);
    } catch (err) {
      console.error('Failed to load authentication state:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setProfile(res.profile);
    return res.profile;
  };

  const signup = async (email: string, displayName: string, password: string) => {
    const res = await api.signup(email, displayName, password);
    setProfile(res.profile);
    await refresh();
    return { profile: res.profile, firstAccount: res.first_account };
  };

  const logout = async () => {
    await api.logout();
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  const isOwner = profile?.role === 'owner';

  return <AuthContext.Provider value={{ profile, bootstrapState, isLoading, isAdmin, isOwner, login, signup, logout, refresh }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
