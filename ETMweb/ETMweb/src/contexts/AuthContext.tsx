import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Account } from '../types';
import { authApi, onSessionExpired, resetTransportState, toApiError } from '../services/api';
import { clearPrivateQueries } from '../services/queryClient';

type Status = 'loading' | 'authenticated' | 'anonymous' | 'error';
interface AuthState {
  user: Account | null;
  status: Status;
  error: string | null;
  sessionMessage: string | null;
  signIn: (input: { email: string; password: string }) => Promise<Account>;
  signOut: () => Promise<void>;
  reload: () => Promise<Account | null>;
  updateUser: (user: Account) => void;
  clearRevokedSession: () => void;
}
const AuthContext = createContext<AuthState | null>(null);
let loadingSession: Promise<Account> | null = null;
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const current = useRef<Account | null>(null);
  const updateUser = useCallback((account: Account) => {
    current.current = account;
    setUser(account);
    setStatus('authenticated');
    setError(null);
  }, []);
  const clear = useCallback(() => {
    current.current = null;
    setUser(null);
    setStatus('anonymous');
    clearPrivateQueries();
  }, []);
  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (!loadingSession)
        loadingSession = authApi.me().finally(() => {
          loadingSession = null;
        });
      const account = await loadingSession;
      updateUser(account);
      return account;
    } catch (cause) {
      const failure = toApiError(cause);
      if ([400, 401, 403].includes(failure.status)) {
        clear();
        return null;
      }
      setStatus('error');
      setError(failure.message);
      throw failure;
    }
  }, [clear, updateUser]);
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      if (current.current) setSessionMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      clear();
    });
    void reload().catch(() => undefined);
    return unsubscribe;
  }, [clear, reload]);
  const signIn = async (input: { email: string; password: string }) => {
    await authApi.login(input);
    const account = await authApi.me();
    updateUser(account);
    setSessionMessage(null);
    clearPrivateQueries();
    return account;
  };
  const signOut = async () => {
    await authApi.logout();
    clear();
    resetTransportState();
    setSessionMessage(null);
  };
  const clearRevokedSession = () => {
    clear();
    resetTransportState();
    setSessionMessage(null);
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        error,
        sessionMessage,
        reload,
        updateUser,
        signIn,
        signOut,
        clearRevokedSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
