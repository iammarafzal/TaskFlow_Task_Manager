import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('__obsidianflow_jwt');
    const storedUser = localStorage.getItem('__obsidianflow_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('__obsidianflow_jwt');
        localStorage.removeItem('__obsidianflow_user');
      }
    }
    setIsInitializing(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('__obsidianflow_jwt', newToken);
    localStorage.setItem('__obsidianflow_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('__obsidianflow_jwt');
    localStorage.removeItem('__obsidianflow_user');
    setToken(null);
    setUser(null);
  };

  if (isInitializing) {
    return null; // Or a minimalist cinematic loader
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
