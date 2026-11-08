import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
type Theme = 'dark' | 'light';
const THEME_VERSION = 'blue-light-v1';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => undefined,
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      // Start the new visual identity in light mode, including browsers that
      // still carry the old purple interface's saved dark preference.
      if (localStorage.getItem('etm-theme-version') !== THEME_VERSION) return 'light';
      return localStorage.getItem('etm-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('etm-theme', theme);
      localStorage.setItem('etm-theme-version', THEME_VERSION);
    } catch {
      /* Nonessential preference. */
    }
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{ theme, toggle: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
