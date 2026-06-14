/**
 * App: Main Orchestrator for the Personal Knowledge Manager.
 * Glues database events, UI updates, shortcuts, and routing.
 */
const App = (() => {
  // App Reactive State
  const state = {
    links: [],
    activeView: 'dashboard',
    searchQuery: '',
    filters: {
      platform: '',
      favorite: null,
      readStatus: '',
      currentLearning: null,
      tag: ''
    },
    sorting: 'newest', // 'newest' | 'oldest' | 'recentlyUpdated' | 'alphabetical'
    layoutMode: 'grid', // 'grid' | 'list'
    selectedIds: [], // for bulk operations
    editingLinkId: null, // tracks link currently being edited
    duplicatePayload: null // temporarily stores linkData if duplicate URL alert is triggered
  };

  let deferredPrompt = null;
  let autosaveTimeout = null;

  /**
   * App Initializer
   */
  const init = async () => {
    // 1. Initialise Persistence Store
    try {
      await PKMStore.init();
    } catch (e) {
      console.error("IndexedDB initialisation failed", e);
      UIManager.showToast("Could not load database. Running in offline/read-only mode.", "error");
    }

    // 2. Initialise Theme
    ThemeManager.init();

    // 3. Register Service Worker for PWA
    registerServiceWorker();

    // 4. Initialise UI Toast Containers
    UIManager.init();

    // 5. Initialise Keyboard Shortcuts
    ShortcutManager.init(App);

    // 6. Bind Event Listeners
    bindEvents();

    // 7. Load Data & Render initial state
    await loadData();
    
    // Set initial view from localStorage or default
    const savedView = localStorage.getItem('pkm_active_view') || 'dashboard';
    navigateTo(savedView);

    // Re-fill tag dropdowns
    populateTagsFilter();

    console.log("LinkVault fully initialised.");
  };

  /**
   * Registers PWA service worker
   */
  const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(() => {
        showPWAInstallToast();
      }, 3000);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      UIManager.showToast("LinkVault installed successfully! You can now use it standalone offline.", "success");
    });
  };

  /**
   * Show PWA installation prompt toast with trigger action
   */
  const showPWAInstallToast = () => {
    if (!deferredPrompt) return;

    const message = `Install LinkVault for quick standalone and offline access! 
      <button id="pwa-prompt-install-btn" class="ml-3 px-3 py-1.5 bg-brand-650 text-white rounded-lg text-2xs font-bold active:scale-90 transition-transform">Install</button>`;
    
    UIManager.showToast(message, "info");

    setTimeout(() => {
      const btn = document.getElementById('pwa-prompt-install-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`PWA install prompt choice: ${outcome}`);
          deferredPrompt = null;
        });
      }
    }, 100);
  };

  /**
   * Load records from database
   */
  const loadData = async () => {
    try {
      state.links = await PKMStore.getAllLinks();
      state.selectedIds = []; // clear selection
      updateBulkActionBar();
      refreshUI();
    } catch (e) {
      console.error("Failed to load links from store", e);
    }
  };

  /**
   * Refresh all components
   */
  const refreshUI = () => {
    // 1. Refresh Dashboard Info & Charts
    UIManager.renderDashboard(state.links);

    // 2. Render Learning Queue list
    renderQueueWidget();

    // 3. Calculate Streaks & Calendar logs
    calculateStreaks();

    // 4. Render cards based on view filtering
    renderViewCards();
  };

  /**
   * Renders the reorderable queue items list
   */
  const renderQueueWidget = () => {
    const queueItems = state.links
      .filter(l => typeof l.queueOrder === 'number')
      .sort((a, b) => a.queueOrder - b.queueOrder);
    UIManager.renderLearningQueue(queueItems);
  };

  /**
   * Calculates current and longest learning streaks from activity logs
   */
  const calculateStreaks = async () => {
    try {
      const logs = await PKMStore.getActivityLogs();
      const streakCountTxt = document.getElementById('streak-count-txt');
      const streakLongestTxt = document.getElementById('streak-longest-txt');
      const badgesContainer = document.getElementById('streak-badges-container');
      
      if (!streakCountTxt) return;

      if (logs.length === 0) {
        streakCountTxt.innerText = "0 Days";
        streakLongestTxt.innerText = "Longest: 0 days";
        badgesContainer.innerHTML = '';
        return;
      }

      // Convert timestamps to unique sorted dates descending
      const uniqueDates = [...new Set(logs.map(log => new Date(log.timestamp).toDateString()))]
        .map(dStr => new Date(dStr))
        .sort((a, b) => b - a); // Newest to oldest

      const today = new Date();
      const todayStr = today.toDateString();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toDateString();

      // Check if user has logged activity today or yesterday to continue current streak
      const newestLogStr = uniqueDates[0] ? uniqueDates[0].toDateString() : '';
      const hasActivityRecently = (newestLogStr === todayStr || newestLogStr === yesterdayStr);

      let currentStreak = 0;
      if (hasActivityRecently) {
        currentStreak = 1;
        let lastDate = uniqueDates[0];
        
        for (let i = 1; i < uniqueDates.length; i++) {
          const diffTime = Math.abs(lastDate - uniqueDates[i]);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreak++;
            lastDate = uniqueDates[i];
          } else if (diffDays > 1) {
            break; // Streak broken
          }
        }
      }

      // Calculate Longest Streak
      let longestStreak = 0;
      if (uniqueDates.length > 0) {
        let tempStreak = 1;
        let lastDate = uniqueDates[uniqueDates.length - 1]; // oldest

        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const diffTime = Math.abs(uniqueDates[i] - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
          } else if (diffDays > 1) {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
          lastDate = uniqueDates[i];
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      // Update text fields
      streakCountTxt.innerText = `${currentStreak} Day${currentStreak === 1 ? '' : 's'}`;
      streakLongestTxt.innerText = `Longest: ${longestStreak} day${longestStreak === 1 ? '' : 's'}`;

      // Render Badges
      let badgesHTML = '';
      if (longestStreak >= 3) {
        badgesHTML += `
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25" title="Consistently learned for 3 consecutive days!">
            <i data-lucide="zap" class="w-3 h-3 fill-amber-500"></i> Consistent
          </span>
        `;
      }
      if (longestStreak >= 7) {
        badgesHTML += `
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/25" title="Learned for 7 consecutive days!">
            <i data-lucide="award" class="w-3 h-3"></i> Weekly Champion
          </span>
        `;
      }
      if (longestStreak >= 30) {
        badgesHTML += `
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25" title="Maintained a 30-day streak!">
            <i data-lucide="crown" class="w-3 h-3"></i> Obsidian Master
          </span>
        `;
      }
      badgesContainer.innerHTML = badgesHTML;
      lucide.createIcons({ attrs: { class: 'lucide-icon' } });

    } catch (err) {
      console.error("Streak calculation failed", err);
    }
  };

  /**
   * Filters and renders links depending on currently active SPA view
   */
  const renderViewCards = () => {
    const activeView = state.activeView;
    let filtered = [...state.links];

    // Filter by view contexts first
    if (activeView === 'learning') {
      filtered = filtered.filter(link => link.currentLearning);
    }

    // Apply Real-time search terms (title, URL, notes, tags)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(link => 
        (link.title && link.title.toLowerCase().includes(q)) ||
        (link.url && link.url.toLowerCase().includes(q)) ||
        (link.notes && link.notes.toLowerCase().includes(q)) ||
        (link.tags && link.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // Apply real-time sidebar/toolbar filters
    if (state.filters.platform) {
      filtered = filtered.filter(link => link.platform === state.filters.platform);
    }
    if (state.filters.favorite !== null) {
      filtered = filtered.filter(link => link.favorite === state.filters.favorite);
    }
    if (state.filters.readStatus) {
      filtered = filtered.filter(link => link.readStatus === state.filters.readStatus);
    }
    if (state.filters.currentLearning !== null) {
      filtered = filtered.filter(link => link.currentLearning === state.filters.currentLearning);
    }
    if (state.filters.tag) {
      filtered = filtered.filter(link => link.tags.includes(state.filters.tag));
    }

    // Apply Sorting
    filtered.sort((a, b) => {
      if (state.sorting === 'newest') return b.dateAdded - a.dateAdded;
      if (state.sorting === 'oldest') return a.dateAdded - b.dateAdded;
      if (state.sorting === 'recentlyUpdated') return b.lastUpdated - a.lastUpdated;
      if (state.sorting === 'alphabetical') {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    // Populate card rendering
    const containerId = activeView === 'learning' ? 'learning-list' : 'library-list';
    UIManager.renderLinkCards(filtered, containerId, state.layoutMode, state.selectedIds);
  };

  /**
   * Refresh Tag select dropdown in sidebar
   */
  const populateTagsFilter = () => {
    const filterSelect = document.getElementById('filter-tag');
    if (!filterSelect) return;

    const tagSet = new Set();
    state.links.forEach(link => {
      if (Array.isArray(link.tags)) {
        link.tags.forEach(t => tagSet.add(t));
      }
    });

    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Tags</option>';
    Array.from(tagSet).sort().forEach(tag => {
      filterSelect.innerHTML += `<option value="${tag}" ${tag === currentVal ? 'selected' : ''}>#${tag}</option>`;
    });
  };

  /**
   * Router/SPA View Navigator
   */
  const navigateTo = (viewName) => {
    if (!['dashboard', 'links', 'learning', 'settings'].includes(viewName)) return;

    state.activeView = viewName;
    localStorage.setItem('pkm_active_view', viewName);

    // 1. Sync Desktop Sidebar States
    document.querySelectorAll('.nav-link').forEach(link => {
      const active = link.getAttribute('data-view') === viewName;
      if (active) {
        link.classList.add('bg-brand-50', 'text-brand-650', 'dark:bg-brand-950/40', 'dark:text-brand-400');
        link.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-800/40');
      } else {
        link.classList.remove('bg-brand-50', 'text-brand-655', 'dark:bg-brand-950/40', 'dark:text-brand-400');
        link.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-800/40');
      }
    });

    // 2. Sync Mobile Bottom Navigation States
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      const active = link.getAttribute('data-view') === viewName;
      if (active) {
        link.classList.add('text-brand-600', 'dark:text-brand-400');
        link.classList.remove('text-slate-400', 'dark:text-slate-550');
      } else {
        link.classList.remove('text-brand-600', 'dark:text-brand-400');
        link.classList.add('text-slate-400', 'dark:text-slate-555');
      }
    });

    // 3. Sync Drawer Navigation States
    document.querySelectorAll('.drawer-nav-link').forEach(link => {
      const active = link.getAttribute('data-view') === viewName;
      if (active) {
        link.classList.add('bg-brand-50', 'text-brand-655', 'dark:bg-brand-950/30', 'dark:text-brand-400');
        link.classList.remove('text-slate-600', 'dark:text-slate-350', 'hover:bg-slate-50', 'dark:hover:bg-slate-800');
      } else {
        link.classList.remove('bg-brand-50', 'text-brand-655', 'dark:bg-brand-950/30', 'dark:text-brand-400');
        link.classList.add('text-slate-600', 'dark:text-slate-350', 'hover:bg-slate-50', 'dark:hover:bg-slate-800');
      }
    });

    // Toggle View Sections
    document.querySelectorAll('.view-section').forEach(section => {
      if (section.id === `${viewName}-view`) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });

    // Load active cards
    renderViewCards();
  };

  /**
   * Slide-in mobile menu drawer controls
   */
  const openMobileDrawer = () => {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const panel = document.getElementById('mobile-drawer-panel');
    if (!overlay || !panel) return;

    overlay.classList.remove('hidden');
    overlay.offsetHeight; 
    overlay.classList.add('opacity-100');
    overlay.classList.remove('opacity-0');
    panel.classList.remove('-translate-x-full');
    panel.classList.add('translate-x-0');
  };

  const closeMobileDrawer = () => {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const panel = document.getElementById('mobile-drawer-panel');
    if (!overlay || !panel) return;

    overlay.classList.add('opacity-0');
    overlay.classList.remove('opacity-100');
    panel.classList.add('-translate-x-full');
    panel.classList.remove('translate-x-0');

    const onEnd = () => {
      overlay.classList.add('hidden');
      overlay.removeEventListener('transitionend', onEnd);
    };
    overlay.addEventListener('transitionend', onEnd);
  };

  /**
   * Auto Detect Platform based on input URL
   */
  const detectPlatform = (url) => {
    if (!url) return 'website';
    const lowerUrl = url.toLowerCase().trim();

    if (lowerUrl.includes('github.com')) return 'github';
    if (lowerUrl.includes('linkedin.com')) return 'linkedin';
    if (lowerUrl.includes('figma.com')) return 'figma';
    if (lowerUrl.includes('instagram.com')) return 'instagram';
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('facebook.com')) return 'facebook';
    if (lowerUrl.includes('reddit.com')) return 'reddit';
    if (lowerUrl.endsWith('.pdf')) return 'pdf';
    
    if (lowerUrl.includes('/docs/') || lowerUrl.includes('gitbook') || lowerUrl.includes('readme')) return 'documentation';
    if (lowerUrl.includes('medium.com') || lowerUrl.includes('substack.com') || lowerUrl.includes('/blog/')) return 'blog';
    
    return 'website';
  };

  /**
   * Handles dynamic showing/hiding of YT/IG sublink & next link fields in form
   */
  const togglePlatformFormFields = (platform) => {
    const extraFields = document.getElementById('platform-specific-fields');
    if (!extraFields) return;

    if (platform === 'youtube' || platform === 'instagram') {
      extraFields.classList.remove('hidden');
    } else {
      extraFields.classList.add('hidden');
    }
  };

  /**
   * Auto save notes debouncer triggers
   */
  const triggerAutoSave = () => {
    const indicator = document.getElementById('notes-autosave-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.innerText = "Saving draft...";
    }

    if (autosaveTimeout) clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(async () => {
      const notes = document.getElementById('link-notes').value;
      
      if (state.editingLinkId) {
        try {
          await PKMStore.updateLink(state.editingLinkId, { notes });
          if (indicator) indicator.innerText = "Auto-saved";
          
          // Silently refresh memory storage
          state.links = await PKMStore.getAllLinks();
          UIManager.renderDashboard(state.links);
        } catch (e) {
          if (indicator) indicator.innerText = "Auto-save failed";
        }
      } else {
        localStorage.setItem('pkm_notes_draft', notes);
        if (indicator) indicator.innerText = "Draft saved";
      }

      setTimeout(() => {
        if (indicator) indicator.classList.add('hidden');
      }, 1500);
    }, 800);
  };

  /**
   * Swaps queueOrder indices for reordering queue items
   */
  const moveQueueItem = async (id, direction) => {
    const queueItems = state.links
      .filter(l => typeof l.queueOrder === 'number')
      .sort((a, b) => a.queueOrder - b.queueOrder);

    const index = queueItems.findIndex(l => l.id === id);
    if (index === -1) return;

    const swapWithIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapWithIndex < 0 || swapWithIndex >= queueItems.length) return;

    // Swap position values
    const tempOrder = queueItems[index].queueOrder;
    queueItems[index].queueOrder = queueItems[swapWithIndex].queueOrder;
    queueItems[swapWithIndex].queueOrder = tempOrder;

    try {
      const orderedIds = queueItems.map(item => item.id);
      await PKMStore.updateQueuePositions(orderedIds);
      await loadData();
      UIManager.showToast("Queue reordered", "success");
    } catch (e) {
      UIManager.showToast("Failed to reorder queue", "error");
    }
  };

  /**
   * Commit form payload bookmark to database (inserts or updates)
   */
  const commitBookmark = async (payload) => {
    try {
      if (state.editingLinkId) {
        await PKMStore.updateLink(state.editingLinkId, payload);
        UIManager.showToast("Bookmark updated successfully!", "success");
      } else {
        await PKMStore.addLink(payload);
        UIManager.showToast("Bookmark saved!", "success");
      }

      await loadData();
      populateTagsFilter();
      closeAllModals();
    } catch (err) {
      console.error(err);
      UIManager.showToast("Failed to save bookmark", "error");
    }
  };

  /**
   * Bind event listeners for UI elements
   */
  const bindEvents = () => {
    // 1. Navigation click bindings
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        navigateTo(view);
      });
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        navigateTo(view);
      });
    });

    document.querySelectorAll('.drawer-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        navigateTo(view);
        closeMobileDrawer();
      });
    });

    // Drawer triggers
    const hamburgerBtn = document.getElementById('hamburger-menu-btn');
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileDrawer);

    const mobileMoreBtn = document.getElementById('mobile-more-btn');
    if (mobileMoreBtn) mobileMoreBtn.addEventListener('click', openMobileDrawer);

    const drawerCloseBtn = document.getElementById('drawer-close-btn');
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeMobileDrawer);

    const drawerOverlay = document.getElementById('mobile-drawer-overlay');
    if (drawerOverlay) {
      drawerOverlay.addEventListener('mousedown', (e) => {
        if (e.target === drawerOverlay) {
          closeMobileDrawer();
        }
      });
    }

    // System features redirection
    const drawerExport = document.getElementById('drawer-export-btn');
    if (drawerExport) {
      drawerExport.addEventListener('click', () => {
        document.getElementById('backup-export-btn').click();
      });
    }
    const drawerImport = document.getElementById('drawer-import-btn');
    if (drawerImport) {
      drawerImport.addEventListener('click', () => {
        document.getElementById('backup-import-btn').click();
      });
    }

    // 2. Global search triggers (suggestions & highlights)
    const searchInput = document.getElementById('search-input');
    const suggestionsDropdown = document.getElementById('search-suggestions-dropdown');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        state.searchQuery = val.trim();
        UIManager.setSearchQuery(state.searchQuery);
        renderViewCards();

        // Populate search title suggestions dropdown
        if (state.searchQuery.length >= 2) {
          const suggestions = state.links
            .filter(link => link.title.toLowerCase().includes(state.searchQuery.toLowerCase()))
            .slice(0, 5);
          UIManager.renderSearchSuggestions(suggestions);
        } else {
          if (suggestionsDropdown) suggestionsDropdown.classList.add('hidden');
        }
      });

      // Clear suggestions dropdown on escape/focus out
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && suggestionsDropdown) {
          suggestionsDropdown.classList.add('hidden');
        }
      });
    }

    // Close suggestions dropdown on outside click
    document.addEventListener('click', (e) => {
      if (suggestionsDropdown && !suggestionsDropdown.contains(e.target) && e.target !== searchInput) {
        suggestionsDropdown.classList.add('hidden');
      }
    });

    // Bind suggestion click routing
    if (suggestionsDropdown) {
      suggestionsDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-suggestion-item');
        if (item) {
          const id = item.getAttribute('data-id');
          openEditModal(id);
          suggestionsDropdown.classList.add('hidden');
          if (searchInput) searchInput.value = '';
        }
      });
    }

    // 3. Filter selects
    const filterPlatform = document.getElementById('filter-platform');
    if (filterPlatform) {
      filterPlatform.addEventListener('change', (e) => {
        state.filters.platform = e.target.value;
        renderViewCards();
      });
    }

    const filterFavorite = document.getElementById('filter-favorite');
    if (filterFavorite) {
      filterFavorite.addEventListener('change', (e) => {
        const val = e.target.value;
        state.filters.favorite = val === 'true' ? true : (val === 'false' ? false : null);
        renderViewCards();
      });
    }

    const filterRead = document.getElementById('filter-read-status');
    if (filterRead) {
      filterRead.addEventListener('change', (e) => {
        state.filters.readStatus = e.target.value;
        renderViewCards();
      });
    }

    const filterTag = document.getElementById('filter-tag');
    if (filterTag) {
      filterTag.addEventListener('change', (e) => {
        state.filters.tag = e.target.value;
        renderViewCards();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sorting = e.target.value;
        renderViewCards();
      });
    }

    // Layout switcher buttons
    const layoutGridBtn = document.getElementById('layout-grid-btn');
    const layoutListBtn = document.getElementById('layout-list-btn');
    if (layoutGridBtn && layoutListBtn) {
      layoutGridBtn.addEventListener('click', () => {
        state.layoutMode = 'grid';
        layoutGridBtn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-slate-100');
        layoutGridBtn.classList.remove('text-slate-400');
        layoutListBtn.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-slate-100');
        layoutListBtn.classList.add('text-slate-400');
        renderViewCards();
      });

      layoutListBtn.addEventListener('click', () => {
        state.layoutMode = 'list';
        layoutListBtn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-slate-100');
        layoutListBtn.classList.remove('text-slate-400');
        layoutGridBtn.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-800', 'dark:text-slate-100');
        layoutGridBtn.classList.add('text-slate-400');
        renderViewCards();
      });
    }

    // 4. Notes Markdown edit/preview toggling
    const notesTabEdit = document.getElementById('notes-tab-edit');
    const notesTabPreview = document.getElementById('notes-tab-preview');
    const notesEditContainer = document.getElementById('notes-edit-container');
    const notesPreviewContainer = document.getElementById('notes-preview-container');
    const notesTextarea = document.getElementById('link-notes');

    if (notesTabEdit && notesTabPreview && notesEditContainer && notesPreviewContainer) {
      notesTabEdit.addEventListener('click', () => {
        notesEditContainer.classList.remove('hidden');
        notesPreviewContainer.classList.add('hidden');

        notesTabEdit.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-850', 'dark:text-slate-100');
        notesTabEdit.classList.remove('text-slate-400');
        notesTabPreview.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-850', 'dark:text-slate-100');
        notesTabPreview.classList.add('text-slate-400');
      });

      notesTabPreview.addEventListener('click', () => {
        const rawText = notesTextarea.value;
        const html = UIManager.parseMarkdown(rawText);
        notesPreviewContainer.innerHTML = html || '<span class="italic text-slate-400/80">Nothing to preview.</span>';

        notesEditContainer.classList.add('hidden');
        notesPreviewContainer.classList.remove('hidden');

        notesTabPreview.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-850', 'dark:text-slate-100');
        notesTabPreview.classList.remove('text-slate-400');
        notesTabEdit.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-slate-850', 'dark:text-slate-100');
        notesTabEdit.classList.add('text-slate-400');
      });
    }

    // Bind auto save to notes textarea
    if (notesTextarea) {
      notesTextarea.addEventListener('input', triggerAutoSave);
    }

    // 5. Add Link form configurations
    const linkUrlInput = document.getElementById('link-url');
    const linkPlatformSelect = document.getElementById('link-platform');
    if (linkUrlInput && linkPlatformSelect) {
      linkUrlInput.addEventListener('input', async (e) => {
        const url = e.target.value;
        const detected = detectPlatform(url);
        linkPlatformSelect.value = detected;
        togglePlatformFormFields(detected);

        if (url) {
          const dup = await PKMStore.checkDuplicateUrl(url);
          const alertBox = document.getElementById('duplicate-url-alert');
          if (dup && dup.id !== state.editingLinkId) {
            alertBox.classList.remove('hidden');
            alertBox.innerText = `Warning: This URL is already saved: "${dup.title}"`;
          } else {
            alertBox.classList.add('hidden');
          }
        }
      });

      // Fetch metadata on blur or paste
      linkUrlInput.addEventListener('blur', async (e) => {
        const url = e.target.value.trim();
        if (!url || state.editingLinkId) return; // Only auto-fill for new bookmarks

        const platform = linkPlatformSelect.value;
        const loadingBox = document.getElementById('metadata-loading');
        const previewContainer = document.getElementById('metadata-preview-container');
        const thumbImg = document.getElementById('metadata-thumbnail');
        const descTxt = document.getElementById('metadata-desc');
        
        if (loadingBox) loadingBox.classList.remove('hidden');

        try {
          const meta = await MetadataService.extract(url, platform);
          if (meta) {
            const titleInput = document.getElementById('link-title');
            if (meta.title && !titleInput.value) {
              titleInput.value = meta.title;
            }

            if (meta.thumbnail) {
              previewContainer.classList.remove('hidden');
              thumbImg.src = meta.thumbnail;
              descTxt.innerText = meta.description || 'No description available';
            }

            // AI Enrichment
            if (typeof AIEnrichmentService !== 'undefined' && AIEnrichmentService.isEnabled()) {
              const aiData = await AIEnrichmentService.enrich(meta.title || '', meta.description || '', url);
              if (aiData) {
                if (aiData.summary) {
                  const notesInput = document.getElementById('link-notes');
                  if (!notesInput.value) notesInput.value = aiData.summary;
                }
                if (aiData.tags && aiData.tags.length > 0) {
                  const tagsInput = document.getElementById('link-tags');
                  if (!tagsInput.value) tagsInput.value = aiData.tags.join(', ');
                }
                descTxt.innerText = `${aiData.category || ''} • ${aiData.difficulty || ''}\n${aiData.summary || ''}`.trim();
              }
            }
          }
        } catch (err) {
          console.warn("Metadata extraction error:", err);
        } finally {
          if (loadingBox) loadingBox.classList.add('hidden');
        }
      });

      linkPlatformSelect.addEventListener('change', (e) => {
        togglePlatformFormFields(e.target.value);
      });
    }

    const addSublinkBtn = document.getElementById('add-sublink-btn');
    const sublinksContainer = document.getElementById('sublinks-form-container');
    if (addSublinkBtn && sublinksContainer) {
      addSublinkBtn.addEventListener('click', () => {
        UIManager.addSubLinkInput(sublinksContainer);
      });
    }

    // Add Link Form Submission with Duplicate checks
    const addLinkForm = document.getElementById('add-link-form');
    if (addLinkForm) {
      addLinkForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const url = document.getElementById('link-url').value.trim();
        const title = document.getElementById('link-title').value.trim();
        const platform = document.getElementById('link-platform').value;
        const notes = document.getElementById('link-notes').value.trim();
        const tagsString = document.getElementById('link-tags').value;
        const favorite = document.getElementById('link-favorite').checked;
        const currentLearning = document.getElementById('link-learning').checked;
        const addToQueue = document.getElementById('link-queue').checked;
        
        // Progress parsing
        const progressVal = parseInt(document.getElementById('link-progress').value, 10);
        const learningPosition = document.getElementById('link-position').value.trim();
        
        // Keep readStatus in sync with 100% progress
        const readStatus = (progressVal === 100 || document.getElementById('link-read').checked) ? 'read' : 'unread';

        const tags = tagsString
          ? tagsString.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0)
          : [];

        let nextSuggestedLink = '';
        let subLinks = [];
        if (platform === 'youtube' || platform === 'instagram') {
          nextSuggestedLink = document.getElementById('link-next-suggested').value.trim();
          subLinks = UIManager.getSubLinksValues(sublinksContainer);
        }

        // Set queue index order if queued
        let queueOrder = null;
        if (addToQueue) {
          // If already in queue, preserve index. Else, append to end.
          const currentLink = state.editingLinkId ? state.links.find(l => l.id === state.editingLinkId) : null;
          if (currentLink && typeof currentLink.queueOrder === 'number') {
            queueOrder = currentLink.queueOrder;
          } else {
            const queueItems = state.links.filter(l => typeof l.queueOrder === 'number');
            queueOrder = queueItems.length;
          }
        }

        const dataPayload = {
          title,
          url,
          platform,
          tags,
          notes,
          favorite,
          currentLearning,
          readStatus,
          nextSuggestedLink,
          subLinks,
          progress: progressVal,
          learningPosition,
          queueOrder
        };

        // 1. Run Duplicate check
        const duplicate = await PKMStore.checkDuplicateUrl(url);
        if (duplicate && duplicate.id !== state.editingLinkId) {
          // Open Duplicate Warning Confirmation
          state.duplicatePayload = dataPayload;
          document.getElementById('duplicate-warning-title').innerText = duplicate.title;
          UIManager.openModal('duplicate-warning-modal');
        } else {
          // Commit directly
          await commitBookmark(dataPayload);
        }
      });
    }

    // Duplicate Warning Modal button actions
    const dupConfirmBtn = document.getElementById('duplicate-confirm-btn');
    const dupCancelBtn = document.getElementById('duplicate-cancel-btn');
    if (dupConfirmBtn && dupCancelBtn) {
      dupConfirmBtn.addEventListener('click', async () => {
        if (state.duplicatePayload) {
          await commitBookmark(state.duplicatePayload);
          state.duplicatePayload = null;
          UIManager.closeModal('duplicate-warning-modal');
        }
      });

      dupCancelBtn.addEventListener('click', () => {
        state.duplicatePayload = null;
        UIManager.closeModal('duplicate-warning-modal');
      });
    }

    // Quick Add triggers
    const quickAddBtns = document.querySelectorAll('.quick-add-trigger');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        openQuickAddModal();
      });
    });

    // Modal click closures
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) {
          closeAllModals();
        }
      });
    });

    // Bulk selection checkbox clicks
    const bulkSelectAll = document.getElementById('bulk-select-all');
    if (bulkSelectAll) {
      bulkSelectAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const visibleCheckboxes = document.querySelectorAll('.bulk-select-checkbox');
        
        state.selectedIds = [];
        visibleCheckboxes.forEach(cb => {
          cb.checked = isChecked;
          if (isChecked) {
            state.selectedIds.push(cb.getAttribute('data-id'));
          }
        });
        updateBulkActionBar();
      });
    }

    // Document delegation clicks
    document.addEventListener('click', async (e) => {
      // 1. Click logs
      const anchor = e.target.closest('.card-main-anchor, .recent-link-anchor, .sublink-anchor, .queue-item-anchor');
      if (anchor) {
        const id = anchor.getAttribute('data-id');
        if (id) {
          await PKMStore.registerClick(id);
          setTimeout(loadData, 200);
        }
      }

      // 2. Favorite toggle
      const favBtn = e.target.closest('.favorite-toggle-btn');
      if (favBtn) {
        e.preventDefault();
        const id = favBtn.getAttribute('data-id');
        const link = state.links.find(l => l.id === id);
        if (link) {
          const targetFav = !link.favorite;
          await PKMStore.updateLink(id, { favorite: targetFav });
          UIManager.showToast(targetFav ? "Added to Favorites" : "Removed from Favorites", "success");
          await loadData();
        }
      }

      // 3. Learning toggle
      const learnBtn = e.target.closest('.learning-toggle-btn');
      if (learnBtn) {
        e.preventDefault();
        const id = learnBtn.getAttribute('data-id');
        const link = state.links.find(l => l.id === id);
        if (link) {
          const targetLearning = !link.currentLearning;
          await PKMStore.updateLink(id, { currentLearning: targetLearning });
          UIManager.showToast(targetLearning ? "Added to Learning Tracker" : "Removed from Learning Tracker", "success");
          await loadData();
        }
      }

      // 4. Read toggle
      const readBtn = e.target.closest('.read-toggle-btn');
      if (readBtn) {
        e.preventDefault();
        const id = readBtn.getAttribute('data-id');
        const link = state.links.find(l => l.id === id);
        if (link) {
          const targetRead = link.readStatus === 'read' ? 'unread' : 'read';
          const targetProg = targetRead === 'read' ? 100 : 0;
          await PKMStore.updateLink(id, { readStatus: targetRead, progress: targetProg });
          UIManager.showToast(targetRead === 'read' ? "Marked as Completed" : "Marked as Unread", "success");
          await loadData();
        }
      }

      // 5. Options context menu
      const optionsBtn = e.target.closest('.card-options-btn');
      if (optionsBtn) {
        e.stopPropagation();
        const id = optionsBtn.getAttribute('data-id');
        showDropdownMenu(optionsBtn, id);
      }

      // 6. Bulk Checkbox click state
      const bulkCb = e.target.closest('.bulk-select-checkbox');
      if (bulkCb) {
        const id = bulkCb.getAttribute('data-id');
        if (bulkCb.checked) {
          if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
        } else {
          state.selectedIds = state.selectedIds.filter(item => item !== id);
        }
        updateBulkActionBar();
      }

      // 7. Resume Learning Action trigger (Dashboard Continue Learning Card)
      const resumeBtn = e.target.closest('#resume-action-btn');
      if (resumeBtn) {
        const id = resumeBtn.getAttribute('data-id');
        const url = resumeBtn.getAttribute('data-url');
        if (id && url) {
          await PKMStore.registerClick(id);
          window.open(url, '_blank');
          setTimeout(loadData, 200);
        }
      }

      // 8. Next Up in Queue trigger button
      const nextQueueBtn = e.target.closest('.queue-open-next-btn');
      if (nextQueueBtn) {
        const id = nextQueueBtn.getAttribute('data-id');
        const url = nextQueueBtn.getAttribute('data-url');
        if (id && url) {
          await PKMStore.registerClick(id);
          window.open(url, '_blank');
          setTimeout(loadData, 200);
        }
      }

      // 9. Reorder Queue Move Up triggers
      const moveUpBtn = e.target.closest('.queue-move-up-btn');
      if (moveUpBtn) {
        const id = moveUpBtn.getAttribute('data-id');
        await moveQueueItem(id, 'up');
      }

      // 10. Reorder Queue Move Down triggers
      const moveDownBtn = e.target.closest('.queue-move-down-btn');
      if (moveDownBtn) {
        const id = moveDownBtn.getAttribute('data-id');
        await moveQueueItem(id, 'down');
      }

      // 11. Remove from Queue triggers
      const removeQueueBtn = e.target.closest('.queue-remove-btn');
      if (removeQueueBtn) {
        const id = removeQueueBtn.getAttribute('data-id');
        await PKMStore.updateLink(id, { queueOrder: null });
        await loadData();
        UIManager.showToast("Removed from Queue", "success");
      }

      // 12. Mark Queue complete check toggle click
      const queueCompleteToggleBtn = e.target.closest('.queue-complete-toggle-btn');
      if (queueCompleteToggleBtn) {
        const id = queueCompleteToggleBtn.getAttribute('data-id');
        const link = state.links.find(l => l.id === id);
        if (link) {
          const isCompleted = link.progress === 100;
          const targetRead = isCompleted ? 'unread' : 'read';
          const targetProg = isCompleted ? 0 : 100;
          // Set queueOrder to null if complete, else keep in queue
          const queueOrder = isCompleted ? link.queueOrder : null;

          await PKMStore.updateLink(id, { readStatus: targetRead, progress: targetProg, queueOrder });
          UIManager.showToast(isCompleted ? "Marked Unread" : "Goal Completed!", "success");
          await loadData();
        }
      }
    });

    // Bulk deletion
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', async () => {
        if (state.selectedIds.length === 0) return;
        
        if (confirm(`Are you sure you want to delete ${state.selectedIds.length} bookmarks?`)) {
          try {
            await PKMStore.bulkDelete(state.selectedIds);
            UIManager.showToast(`Deleted ${state.selectedIds.length} bookmarks`, "success");
            await loadData();
            populateTagsFilter();
          } catch (err) {
            UIManager.showToast("Failed to delete selected bookmarks", "error");
          }
        }
      });
    }

    // Bulk Read mark
    const bulkReadBtn = document.getElementById('bulk-read-btn');
    if (bulkReadBtn) {
      bulkReadBtn.addEventListener('click', async () => {
        if (state.selectedIds.length === 0) return;
        try {
          await Promise.all(state.selectedIds.map(id => PKMStore.updateLink(id, { readStatus: 'read', progress: 100 })));
          UIManager.showToast(`Marked ${state.selectedIds.length} bookmarks as completed`, "success");
          await loadData();
        } catch (err) {
          UIManager.showToast("Failed to update bookmarks", "error");
        }
      });
    }

    // Bulk favorites
    const bulkFavBtn = document.getElementById('bulk-fav-btn');
    if (bulkFavBtn) {
      bulkFavBtn.addEventListener('click', async () => {
        if (state.selectedIds.length === 0) return;
        try {
          await Promise.all(state.selectedIds.map(id => PKMStore.updateLink(id, { favorite: true })));
          UIManager.showToast(`Marked ${state.selectedIds.length} bookmarks as favorites`, "success");
          await loadData();
        } catch (err) {
          UIManager.showToast("Failed to update bookmarks", "error");
        }
      });
    }

    // Continue learning trigger
    const continueBtn = document.getElementById('continue-learning-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        const activeLearning = state.links.filter(l => l.currentLearning);
        if (activeLearning.length === 0) {
          UIManager.showToast("No active learning bookmarks found. Add some or check them on library page!", "info");
          return;
        }

        activeLearning.sort((a, b) => {
          const timeA = a.lastOpened || a.dateAdded;
          const timeB = b.lastOpened || b.dateAdded;
          return timeB - timeA;
        });

        const target = activeLearning[0];
        UIManager.showToast(`Continuing: "${target.title}"`, "info");
        
        PKMStore.registerClick(target.id).then(() => {
          loadData();
        });
        
        window.open(target.url, '_blank');
      });
    }

    // Backup export
    const exportBtn = document.getElementById('backup-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const dataStr = await PKMStore.exportBackup();
          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
          const exportFileDefaultName = `linkvault_backup_${new Date().toISOString().slice(0,10)}.json`;

          const linkElement = document.createElement('a');
          linkElement.setAttribute('href', dataUri);
          linkElement.setAttribute('download', exportFileDefaultName);
          linkElement.click();
          UIManager.showToast("Backup file downloaded!", "success");
        } catch (err) {
          UIManager.showToast("Failed to export backup data", "error");
        }
      });
    }

    // Backup import
    const importBtn = document.getElementById('backup-import-btn');
    const importFile = document.getElementById('backup-import-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => {
        importFile.click();
      });

        importFile.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (evt) => {
            try {
              const results = await PKMStore.importBackup(evt.target.result);
              UIManager.showToast(`Successfully restored: Added ${results.added} links. Skipped ${results.skipped} duplicates.`, "success");
              await loadData();
              populateTagsFilter();
            } catch (err) {
              UIManager.showToast("Failed to parse backup file. Invalid format.", "error");
            }
          };
          reader.readAsText(file);
        });
      }

      // Dynamic markdown preview codeblock copying via event delegation
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.code-copy-btn');
        if (btn) {
          const pre = btn.closest('pre');
          const code = pre ? pre.querySelector('code') : null;
          if (code) {
            const text = code.innerText || code.textContent;
            navigator.clipboard.writeText(text).then(() => {
              btn.textContent = 'Copied!';
              btn.classList.add('bg-emerald-600', 'text-white');
              setTimeout(() => {
                btn.textContent = 'Copy';
                btn.classList.remove('bg-emerald-600', 'text-white');
              }, 2000);
              UIManager.showToast("Code copied to clipboard!", "success");
            }).catch(() => {
              UIManager.showToast("Failed to copy code", "error");
            });
          }
        }
      });

      // Settings API Key binding
      const settingsKeyInput = document.getElementById('settings-openrouter-key');
      const settingsSaveBtn = document.getElementById('settings-save-btn');
      if (settingsKeyInput && settingsSaveBtn && typeof AIEnrichmentService !== 'undefined') {
        settingsKeyInput.value = AIEnrichmentService.getApiKey();
        settingsSaveBtn.addEventListener('click', () => {
          AIEnrichmentService.setApiKey(settingsKeyInput.value.trim());
          UIManager.showToast('Settings saved successfully', 'success');
        });
      }
    };

  /**
   * Action bar overlay for multi-select checkboxes
   */
  const updateBulkActionBar = () => {
    const bar = document.getElementById('bulk-action-bar');
    const selectAllCb = document.getElementById('bulk-select-all');
    if (!bar) return;

    const count = state.selectedIds.length;
    if (count > 0) {
      bar.classList.remove('hidden');
      document.getElementById('bulk-selected-count').innerText = `${count} selected`;
      if (selectAllCb) {
        const visibleCheckboxes = document.querySelectorAll('.bulk-select-checkbox');
        selectAllCb.checked = visibleCheckboxes.length > 0 && count === visibleCheckboxes.length;
      }
    } else {
      bar.classList.add('hidden');
      if (selectAllCb) selectAllCb.checked = false;
    }
  };

  /**
   * Action popup overlay on link cards options button click
   */
  const showDropdownMenu = (btnElement, id) => {
    document.querySelectorAll('.app-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'app-context-menu absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 shadow-xl z-20 py-2 text-sm font-semibold scale-95 opacity-0 transition-all origin-top-right';
    
    menu.innerHTML = `
      <button class="menu-edit-btn w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center">
        <i data-lucide="edit-3" class="w-4 h-4 mr-2.5"></i> Edit Entry
      </button>
      <button class="menu-copy-url-btn w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center">
        <i data-lucide="copy" class="w-4 h-4 mr-2.5"></i> Copy URL
      </button>
      <button class="menu-copy-notes-btn w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center">
        <i data-lucide="file-text" class="w-4 h-4 mr-2.5"></i> Copy Notes
      </button>
      <button class="menu-copy-resource-btn w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center">
        <i data-lucide="clipboard" class="w-4 h-4 mr-2.5"></i> Copy Resource (JSON)
      </button>
      <div class="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
      <button class="menu-delete-btn w-full text-left px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-650 dark:text-rose-400 flex items-center">
        <i data-lucide="trash-2" class="w-4 h-4 mr-2.5"></i> Delete Entry
      </button>
    `;

    btnElement.parentElement.appendChild(menu);
    lucide.createIcons({ attrs: { class: 'lucide-icon' } });

    requestAnimationFrame(() => {
      menu.classList.remove('scale-95', 'opacity-0');
    });

    const handleClose = () => {
      menu.remove();
      document.removeEventListener('click', handleClose);
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleClose);
    }, 50);

    menu.querySelector('.menu-edit-btn').addEventListener('click', () => {
      openEditModal(id);
    });

    // Clipboard Copy URL
    menu.querySelector('.menu-copy-url-btn').addEventListener('click', () => {
      const link = state.links.find(l => l.id === id);
      if (link) {
        navigator.clipboard.writeText(link.url)
          .then(() => UIManager.showToast("Link URL copied!", "success"))
          .catch(() => UIManager.showToast("Failed to copy URL", "error"));
      }
    });

    // Clipboard Copy Notes
    menu.querySelector('.menu-copy-notes-btn').addEventListener('click', () => {
      const link = state.links.find(l => l.id === id);
      if (link) {
        navigator.clipboard.writeText(link.notes || '')
          .then(() => UIManager.showToast("Notes text copied!", "success"))
          .catch(() => UIManager.showToast("Failed to copy notes", "error"));
      }
    });

    // Clipboard Copy Resource JSON
    menu.querySelector('.menu-copy-resource-btn').addEventListener('click', () => {
      const link = state.links.find(l => l.id === id);
      if (link) {
        navigator.clipboard.writeText(JSON.stringify(link, null, 2))
          .then(() => UIManager.showToast("Bookmark JSON payload copied!", "success"))
          .catch(() => UIManager.showToast("Failed to copy payload", "error"));
      }
    });

    menu.querySelector('.menu-delete-btn').addEventListener('click', async () => {
      if (confirm("Are you sure you want to delete this bookmark?")) {
        try {
          await PKMStore.deleteLink(id);
          UIManager.showToast("Bookmark deleted", "success");
          await loadData();
          populateTagsFilter();
        } catch (err) {
          UIManager.showToast("Failed to delete bookmark", "error");
        }
      }
    });
  };

  /**
   * Reset the add/edit form data and clear draft caches
   */
  const resetForm = () => {
    state.editingLinkId = null;
    document.getElementById('add-link-form').reset();
    document.getElementById('modal-title-text').innerText = "Add New Bookmark";
    document.getElementById('duplicate-url-alert').classList.add('hidden');
    document.getElementById('sublinks-form-container').innerHTML = '';
    
    // Notes tab resets
    document.getElementById('notes-tab-edit').click();
    document.getElementById('notes-autosave-indicator').classList.add('hidden');

    // Clear metadata preview
    const previewContainer = document.getElementById('metadata-preview-container');
    if (previewContainer) {
      previewContainer.classList.add('hidden');
      document.getElementById('metadata-thumbnail').src = '';
      document.getElementById('metadata-desc').innerText = 'Loading metadata...';
    }

    togglePlatformFormFields('website');
  };

  /**
   * Opens modal in Create Mode
   */
  const openQuickAddModal = () => {
    resetForm();
    
    // Auto load draft notes if saved
    const draft = localStorage.getItem('pkm_notes_draft');
    if (draft) {
      document.getElementById('link-notes').value = draft;
    }

    UIManager.openModal('add-link-modal');
  };

  /**
   * Opens modal in Edit Mode and populates current fields
   */
  const openEditModal = async (id) => {
    resetForm();
    state.editingLinkId = id;
    
    try {
      const link = await PKMStore.getLinkById(id);
      if (!link) return;

      document.getElementById('modal-title-text').innerText = "Edit Bookmark Settings";
      
      // Populate fields
      document.getElementById('link-url').value = link.url;
      document.getElementById('link-title').value = link.title;
      document.getElementById('link-platform').value = link.platform;
      document.getElementById('link-notes').value = link.notes;
      document.getElementById('link-tags').value = (link.tags || []).join(', ');
      document.getElementById('link-favorite').checked = !!link.favorite;
      document.getElementById('link-learning').checked = !!link.currentLearning;
      
      // Advanced features mapping
      document.getElementById('link-progress').value = (link.progress !== undefined) ? link.progress.toString() : '0';
      document.getElementById('link-position').value = link.learningPosition || '';
      document.getElementById('link-queue').checked = typeof link.queueOrder === 'number';
      document.getElementById('link-read').checked = link.readStatus === 'read';

      // Toggle platform specific controls
      togglePlatformFormFields(link.platform);

      if (link.platform === 'youtube' || link.platform === 'instagram') {
        document.getElementById('link-next-suggested').value = link.nextSuggestedLink || '';
        const container = document.getElementById('sublinks-form-container');
        container.innerHTML = '';
        if (Array.isArray(link.subLinks)) {
          link.subLinks.forEach(sub => {
            UIManager.addSubLinkInput(container, sub.label, sub.url);
          });
        }
      }

      UIManager.openModal('add-link-modal');
    } catch (err) {
      UIManager.showToast("Could not load bookmark details for editing.", "error");
    }
  };

  const openShortcutsModal = () => {
    UIManager.openModal('shortcuts-modal');
  };

  const closeAllModals = () => {
    UIManager.closeModal('add-link-modal');
    UIManager.closeModal('shortcuts-modal');
    UIManager.closeModal('duplicate-warning-modal');
  };

  return {
    init,
    navigateTo,
    openQuickAddModal,
    openShortcutsModal,
    closeAllModals
  };
})();

// Bootstrap app on DOM Content Loaded
document.addEventListener('DOMContentLoaded', App.init);

