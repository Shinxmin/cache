import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(0);

  const show = useCallback((message, { error = false, duration = 2600 } = {}) => {
    clearTimeout(timer.current);
    setToast({ message: String(message), error });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast glass${toast.error ? " error" : ""}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
