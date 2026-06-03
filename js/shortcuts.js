/**
 * ShortcutManager: Binds global key event listeners for keyboard navigation.
 * Bypasses triggers when input/textarea components are active.
 */
const ShortcutManager = (() => {
  let appInstance = null;

  /**
   * Initializes shortcuts and binds keydown events.
   * @param {Object} app - The main application instance to call navigation/modal routes.
   */
  const init = (app) => {
    appInstance = app;
    window.addEventListener('keydown', handleKeyDown);
  };

  /**
   * Main keydown listener.
   * @param {KeyboardEvent} event 
   */
  const handleKeyDown = (event) => {
    // Avoid triggering shortcuts if user is typing in forms/inputs
    const activeElement = document.activeElement;
    const isInputField = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.contentEditable === 'true'
    );

    if (isInputField) {
      // Escape should still close a modal even if focused inside it
      if (event.key === 'Escape') {
        event.preventDefault();
        appInstance.closeAllModals();
      }
      return;
    }

    switch (event.key) {
      case '/':
        event.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        break;
      
      case 'n':
      case 'N':
        event.preventDefault();
        appInstance.openQuickAddModal();
        break;

      case 'd':
      case 'D':
        event.preventDefault();
        appInstance.navigateTo('dashboard');
        break;

      case 'l':
      case 'L':
        event.preventDefault();
        appInstance.navigateTo('links');
        break;

      case 't':
      case 'T':
        event.preventDefault();
        appInstance.navigateTo('learning');
        break;

      case '?':
        event.preventDefault();
        appInstance.openShortcutsModal();
        break;

      case 'Escape':
        event.preventDefault();
        appInstance.closeAllModals();
        break;
    }
  };

  return {
    init
  };
})();
