import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  login: (payload: {
    _id: string;
    name: string;
    email: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AUTH_STORAGE_KEY = 'auth_state_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ user: null, accessToken: null, refreshToken: null });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed: AuthState = JSON.parse(raw);
          setState(parsed);
        }
      } catch (error) {
        // noop
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthState();
  }, []);

  const persistState = async (next: AuthState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      // noop
    }
  };

  const login: AuthContextType['login'] = async (payload) => {
    const next: AuthState = {
      user: {
        _id: payload._id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      },
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    };
    await persistState(next);
  };

  const logout: AuthContextType['logout'] = async () => {
    const next: AuthState = { user: null, accessToken: null, refreshToken: null };
    await persistState(next);
  };

  const value: AuthContextType = useMemo(() => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: Boolean(state.user && state.accessToken),
    login,
    logout,
    isLoading,
  }), [state, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default export for the AuthProvider
export default AuthProvider;
