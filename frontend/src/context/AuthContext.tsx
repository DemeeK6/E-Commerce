import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) as User : null;
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    api.me().then(setUser).catch(() => logout());
  }, [token]);

  const persist = (nextToken: string, nextUser: User) => {
    localStorage.setItem('auth_token', nextToken);
    localStorage.setItem('auth_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    persist(response.token, response.user);
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    const response = await api.register(firstName, lastName, email, password);
    persist(response.token, response.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    isAdmin: user?.roles.includes('Admin') ?? false,
    login,
    register,
    logout,
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
