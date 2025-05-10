import { ref, watch } from 'vue';

export function useTheme() {
  const THEME_KEY = 'theme';
  const DARK_CLASS = 'dark';

  if (!localStorage.getItem(THEME_KEY)) {
    localStorage.setItem(THEME_KEY, 'dark');
  }

  const isDark = ref(localStorage.getItem(THEME_KEY) === 'dark');

  function applyTheme(dark: boolean) {
    document.documentElement.classList.toggle(DARK_CLASS, dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }

  applyTheme(isDark.value);

  watch(isDark, (val) => {
    applyTheme(val);
  });

  function toggleTheme() {
    isDark.value = !isDark.value;
  }

  return {
    isDark,
    toggleTheme,
  };
}
