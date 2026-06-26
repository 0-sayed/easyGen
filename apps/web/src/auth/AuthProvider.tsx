import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { isApiClientError } from "../api/client";
import {
  getCurrentUser,
  logout as logoutRequest,
  signin as signinRequest,
  signup as signupRequest,
  type PublicUser,
} from "./api";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session";
import type { SigninFormValues, SignupFormValues } from "./validation";

interface AuthContextValue {
  accessToken: string | null;
  isLoading: boolean;
  user: PublicUser | null;
  signin: (input: SigninFormValues) => Promise<void>;
  signup: (input: SignupFormValues) => Promise<void>;
  logout: () => Promise<void>;
  replaceUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setCurrentAccessToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let active = true;
    const accessToken = getAccessToken();

    if (accessToken === null) {
      setIsLoading(false);
      return;
    }

    void getCurrentUser(accessToken)
      .then((currentUser) => {
        if (active && getAccessToken() === accessToken) {
          setUser(currentUser);
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          getAccessToken() === accessToken &&
          isApiClientError(error) &&
          error.category === "unauthorized"
        ) {
          clearAccessToken();
          setCurrentAccessToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isLoading,
      user,
      signin: async (input) => {
        const response = await signinRequest(input);
        setAccessToken(response.accessToken);
        setCurrentAccessToken(response.accessToken);
        setUser(response.user);
      },
      signup: async (input) => {
        const response = await signupRequest(input);
        setAccessToken(response.accessToken);
        setCurrentAccessToken(response.accessToken);
        setUser(response.user);
      },
      logout: async () => {
        const accessToken = getAccessToken();

        try {
          if (accessToken !== null) {
            await logoutRequest(accessToken);
          }
        } finally {
          clearAccessToken();
          setCurrentAccessToken(null);
          setUser(null);
        }
      },
      replaceUser: (user) => {
        setUser(user);
      },
    }),
    [accessToken, isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (value === null) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
