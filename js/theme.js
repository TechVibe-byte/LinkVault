/**
 * ThemeManager: Controls Light, Dark, and System Theme settings.
 * Persists settings locally and binds to system event changes.
 */
const ThemeManager = (() => {
  const THEME_KEY = 'pkm_theme';
  const ACCENT_KEY = 'pkm_accent';

  /**
   * Initializes the theme on load based on user settings or system preferences.
   */
  const init = () => {
    // Apply styling transition rules after initial load to prevent screen flash
    setTimeout(() => {
      document.documentElement.classList.add('theme-transitions');
    }, 150);

    const savedTheme = getTheme();
    applyTheme(savedTheme);
    syncUI(savedTheme);

    // Initialize Accent Color Theme
    const savedAccent = getAccent();
    applyAccent(savedAccent);
    syncAccentUI(savedAccent);
    bindAccentTriggers();

    // Watch for system theme changes if set to system
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getTheme() === 'system') {
        applyTheme('system');
      }
    });

    // Bind event listeners for theme switcher triggers in the DOM
    bindThemeTriggers();
  };

  /**
   * Gets the stored preference theme or defaults to 'system'.
   * @returns {string} 'light' | 'dark' | 'system'
   */
  const getTheme = () => {
    return localStorage.getItem(THEME_KEY) || 'system';
  };

  /**
   * Saves the theme setting and triggers theme application.
   * @param {string} themeName 'light' | 'dark' | 'system'
   */
  const setTheme = (themeName) => {
    localStorage.setItem(THEME_KEY, themeName);
    applyTheme(themeName);
    syncUI(themeName);
    
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('themechanged', { detail: themeName }));
  };

  /**
   * Applies the theme settings to the HTML element.
   * @param {string} themeName 'light' | 'dark' | 'system'
   */
  const applyTheme = (themeName) => {
    const isDark = themeName === 'dark' || 
      (themeName === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  /**
   * Syncs theme switches, inputs, and icon displays across all views.
   */
  const syncUI = (themeName) => {
    // 1. Sync dropdown selects if they exist
    const drawerSelector = document.getElementById('drawer-theme-selector');
    if (drawerSelector) {
      drawerSelector.value = themeName;
    }

    const appSelector = document.getElementById('app-theme-selector');
    if (appSelector) {
      appSelector.value = themeName;
    }

    // 2. Sync icon triggers
    const isDark = themeName === 'dark' || 
      (themeName === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      const sun = btn.querySelector('.sun-icon');
      const moon = btn.querySelector('.moon-icon');

      if (isDark) {
        if (sun) sun.classList.remove('hidden');
        if (sun) sun.classList.add('block');
        if (moon) moon.classList.remove('block');
        if (moon) moon.classList.add('hidden');
      } else {
        if (sun) sun.classList.remove('block');
        if (sun) sun.classList.add('hidden');
        if (moon) moon.classList.remove('hidden');
        if (moon) moon.classList.add('block');
      }
    });
  };

  /**
   * Bind DOM triggers (buttons/dropdowns)
   */
  const bindThemeTriggers = () => {
    // Animated buttons clicks (toggles back and forth between light/dark, cycling system)
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = getTheme();
        let target = 'light';
        
        if (current === 'light') {
          target = 'dark';
        } else if (current === 'dark') {
          target = 'system';
        } else {
          // If system, toggles to light/dark depending on current active state
          const isActiveDark = document.documentElement.classList.contains('dark');
          target = isActiveDark ? 'light' : 'dark';
        }
        
        setTheme(target);
        
        // Show indicator toast
        if (typeof UIManager !== 'undefined' && UIManager.showToast) {
          UIManager.showToast(`Theme changed to ${target}`, "info");
        }
      });
    });

    // Drawer selector dropdown change
    const drawerSelector = document.getElementById('drawer-theme-selector');
    if (drawerSelector) {
      drawerSelector.addEventListener('change', (e) => {
        setTheme(e.target.value);
        if (typeof UIManager !== 'undefined' && UIManager.showToast) {
          UIManager.showToast(`Theme set to ${e.target.value}`, "info");
        }
      });
    }

    // Secondary selector dropdown change
    const appSelector = document.getElementById('app-theme-selector');
    if (appSelector) {
      appSelector.addEventListener('change', (e) => {
        setTheme(e.target.value);
      });
    }
  };

  /**
   * Gets the stored preference accent theme or defaults to 'indigo'.
   * @returns {string} 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber'
   */
  const getAccent = () => {
    return localStorage.getItem(ACCENT_KEY) || 'indigo';
  };

  /**
   * Saves the accent theme setting and triggers DOM element data attribute updates.
   * @param {string} accentName 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber'
   */
  const setAccent = (accentName) => {
    localStorage.setItem(ACCENT_KEY, accentName);
    applyAccent(accentName);
    syncAccentUI(accentName);
  };

  /**
   * Applies the accent attribute to the root document element.
   * @param {string} accentName
   */
  const applyAccent = (accentName) => {
    document.documentElement.setAttribute('data-accent', accentName);
  };

  /**
   * Syncs active state on color picker buttons in sidebars and panels.
   */
  const syncAccentUI = (accentName) => {
    const selectCircle = (pickerId) => {
      const picker = document.getElementById(pickerId);
      if (!picker) return;
      picker.querySelectorAll('button').forEach(btn => {
        const val = btn.getAttribute('data-accent-val');
        if (val === accentName) {
          btn.classList.add('ring-4', 'ring-slate-300', 'dark:ring-slate-500', 'border-slate-800', 'dark:border-white');
        } else {
          btn.classList.remove('ring-4', 'ring-slate-300', 'dark:ring-slate-500', 'border-slate-800', 'dark:border-white');
        }
      });
    };
    selectCircle('desktop-accent-picker');
    selectCircle('drawer-accent-picker');
  };

  /**
   * Bind accent color picker click event listeners.
   */
  const bindAccentTriggers = () => {
    const bindPicker = (pickerId) => {
      const picker = document.getElementById(pickerId);
      if (!picker) return;
      picker.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
          const val = btn.getAttribute('data-accent-val');
          if (val) {
            setAccent(val);
            if (typeof UIManager !== 'undefined' && UIManager.showToast) {
              UIManager.showToast(`Accent theme set to ${val}`, "success");
            }
          }
        }
      });
    };
    bindPicker('desktop-accent-picker');
    bindPicker('drawer-accent-picker');
  };

  return {
    init,
    getTheme,
    setTheme,
    getAccent,
    setAccent
  };
})();
