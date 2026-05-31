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
    const storedToken = localStorage.getItem('__taskflow_jwt');
    const storedUser = localStorage.getItem('__taskflow_user');
    const storedExpiry = localStorage.getItem('__taskflow_jwt_expiry');

    if (storedToken && storedUser && storedExpiry) {
      if (Date.now() > parseInt(storedExpiry, 10)) {
        // Token expired
        localStorage.removeItem('__taskflow_jwt');
        localStorage.removeItem('__taskflow_user');
        localStorage.removeItem('__taskflow_jwt_expiry');
      } else {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch (err) {
          localStorage.removeItem('__taskflow_jwt');
          localStorage.removeItem('__taskflow_user');
          localStorage.removeItem('__taskflow_jwt_expiry');
        }
      }
    }
    setIsInitializing(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    // 12 hours from now
    const expiry = Date.now() + 12 * 60 * 60 * 1000;
    
    localStorage.setItem('__taskflow_jwt', newToken);
    localStorage.setItem('__taskflow_user', JSON.stringify(newUser));
    localStorage.setItem('__taskflow_jwt_expiry', expiry.toString());
    
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('__taskflow_jwt');
    localStorage.removeItem('__taskflow_user');
    localStorage.removeItem('__taskflow_jwt_expiry');
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
