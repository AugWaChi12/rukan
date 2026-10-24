import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type AppColors, type ThemeName } from './tokens';

type ThemePreference = ThemeName | 'system';

interface ThemeContextValue {
  name: ThemeName;
  colors: AppColors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** ธีมของแอป — 'system' = ตามเครื่อง (มืด → ดำทอง) · ค่าที่ผู้ใช้เลือกซิงก์กับ profiles.theme */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const name: ThemeName =
    preference === 'system' ? (scheme === 'dark' ? 'gold' : 'light') : preference;

  const value = useMemo(
    () => ({ name, colors: themes[name], preference, setPreference }),
    [name, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme ต้องอยู่ใต้ <AppThemeProvider>');
  return ctx;
}
