import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, BootstrapState } from '../types.ts';
import { api } from '../lib/api.ts';

interface AuthContextType {
  profile: Profile | null;
  bootstrapState: BootstrapState | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  bootstrapState: null,
  isLoading: true,
  isAdmin: false,
  isOwner: false,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bootstrapState, setBootstrapState] = useState<BootstrapState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const bStatus = await api.getBootstrapStatus();
      setBootstrapState(bStatus);

      const storedUser = localStorage.getItem('tdh_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const me = await api.getMe(parsed.email);
        if (me.profile) {
          setProfile(me.profile);
          localStorage.setItem('tdh_user', JSON.stringify(me.profile));
        } else {
          setProfile(null);
          localStorage.removeItem('tdh_user');
        }
      } else {
        // If not logged in, but owner is claimed, check if there is an owner profile
        const me = await api.getMe();
        if (me.profile && (me.profile.role === 'owner' || me.profile.role === 'admin')) {
          setProfile(me.profile);
          localStorage.setItem('tdh_user', JSON.stringify(me.profile));
        } else {
          setProfile(null);
        }
      }
    } catch (err) {
      console.error('Failed to load auth status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string) => {
    const res = await api.login(email);
    if (res.profile) {
      setProfile(res.profile);
      localStorage.setItem('tdh_user', JSON.stringify(res.profile));
    }
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem('tdh_user');
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  const isOwner = profile?.role === 'owner';

  return (
    <AuthContext.Provider
      value={{
        profile,
        bootstrapState,
        isLoading,
        isAdmin,
        isOwner,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
