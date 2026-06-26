import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isApiClientError } from "../api/client";
import {
  deleteAccount as deleteAccountRequest,
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
  reauthMessage: string | null;
  user: PublicUser | null;
  clearReauthMessage: () => void;
  handleRevokedSession: () => void;
  signin: (input: SigninFormValues) => Promise<void>;
  signup: (input: SignupFormValues) => Promise<void>;
  deleteAccount: (currentPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  replaceUser: (user: PublicUser) => void;
}

const REAUTH_REQUIRED_MESSAGE = "Your session expired. Please sign in again.";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setCurrentAccessToken] = useState<string | null>(() => getAccessToken());
  const [reauthMessage, setReauthMessage] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);

  const clearAuthenticatedState = useCallback((message: string | null) => {
    clearAccessToken();
    setCurrentAccessToken(null);
    setUser(null);
    setReauthMessage(message);
  }, []);

  const clearReauthMessage = useCallback(() => {
    setReauthMessage(null);
  }, []);

  const handleRevokedSession = useCallback(() => {
    clearAuthenticatedState(REAUTH_REQUIRED_MESSAGE);
  }, [clearAuthenticatedState]);

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
          handleRevokedSession();
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
  }, [handleRevokedSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isLoading,
      reauthMessage,
      user,
      clearReauthMessage,
      handleRevokedSession,
      signin: async (input) => {
        const response = await signinRequest(input);
        setAccessToken(response.accessToken);
        setCurrentAccessToken(response.accessToken);
        setUser(response.user);
        setReauthMessage(null);
      },
      signup: async (input) => {
        const response = await signupRequest(input);
        setAccessToken(response.accessToken);
        setCurrentAccessToken(response.accessToken);
        setUser(response.user);
        setReauthMessage(null);
      },
      deleteAccount: async (currentPassword) => {
        const accessToken = getAccessToken();

        if (accessToken === null) {
          clearAuthenticatedState(null);
          return;
        }

        await deleteAccountRequest(accessToken, { currentPassword });
        if (getAccessToken() === accessToken) {
          clearAuthenticatedState(null);
        }
      },
      logout: async () => {
        const accessToken = getAccessToken();

        try {
          if (accessToken !== null) {
            await logoutRequest(accessToken);
          }
        } finally {
          clearAuthenticatedState(null);
        }
      },
      replaceUser: (user) => {
        if (accessToken === null || getAccessToken() !== accessToken) {
          return;
        }

        setUser(user);
      },
    }),
    [
      accessToken,
      clearAuthenticatedState,
      clearReauthMessage,
      handleRevokedSession,
      isLoading,
      reauthMessage,
      user,
    ]
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
