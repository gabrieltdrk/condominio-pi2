import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getUser, setStoredUser, type User } from "../features/auth/services/auth";

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  isResident: boolean;
  condominioUUID: string | null;
  /** Atualiza o usuário no contexto e no localStorage. */
  setUser: (u: User | null) => void;
  /** Lê novamente do localStorage (útil após login/logout externos). */
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getUser());

  const setUser = useCallback((u: User | null) => {
    if (u) setStoredUser(u);
    else {
      localStorage.removeItem("user");
    }
    setUserState(u);
  }, []);

  const refreshUser = useCallback(() => {
    setUserState(getUser());
  }, []);

  const value: AuthContextValue = {
    user,
    isAdmin: user?.role === "ADMIN" || user?.role === "MASTER_ADMIN",
    isMasterAdmin: user?.role === "MASTER_ADMIN",
    isResident: user?.role === "MORADOR",
    condominioUUID: user?.condominioUUID ?? null,
    setUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
