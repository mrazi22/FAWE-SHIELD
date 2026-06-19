import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser, LoginPayload } from "../types/auth.types";
import {
  login as loginService,
  logout as logoutService,
  fetchCurrentUser,
} from "../services/auth.service";
import { getToken, removeToken } from "../services/token.service";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const token = getToken();

        if (!token) {
          setUser(null);
          return;
        }

        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to restore session:", error);
        removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function handleLogin(payload: LoginPayload) {
    const loggedInUser = await loginService(payload);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function handleLogout() {
    await logoutService();
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: handleLogin,
      logout: handleLogout,
      setUser,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}