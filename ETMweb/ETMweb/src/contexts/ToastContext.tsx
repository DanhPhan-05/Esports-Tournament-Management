import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
const ToastContext = createContext<(message: string) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(value);
    timer.current = setTimeout(() => setMessage(''), 6000);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div className="toast">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{message}</span>
            <button className="icon-button" aria-label="Đóng thông báo" onClick={() => setMessage('')}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
