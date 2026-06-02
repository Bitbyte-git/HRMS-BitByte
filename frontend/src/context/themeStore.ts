import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  toggleTheme: () => set((state) => {
    const newIsDark = !state.isDarkMode;
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    return { isDarkMode: newIsDark };
  }),
  initializeTheme: () => {
    const isDark = localStorage.getItem('theme') === 'dark';
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      set({ isDarkMode: true });
    } else {
      document.documentElement.classList.remove('dark');
      set({ isDarkMode: false });
    }
  }
}));
