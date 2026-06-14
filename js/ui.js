/**
 * UIManager: Manages dynamic DOM updates, component renders,
 * modals, toast notifications, and SVG progress visualizers.
 */
const UIManager = (() => {
  let toastContainer = null;
  let currentSearchQuery = '';
  let activeTooltip = null;

  const showFloatingTooltip = (targetElement, text) => {
    hideFloatingTooltip();
    activeTooltip = document.createElement('div');
    activeTooltip.className = 'floating-tooltip';
    activeTooltip.textContent = text;
    document.body.appendChild(activeTooltip);
    const rect = targetElement.getBoundingClientRect();
    activeTooltip.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
    activeTooltip.style.top = `${rect.top + window.scrollY}px`;
  };

  const hideFloatingTooltip = () => {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  };

  /**
   * Setup toast container and initial layout wrappers
   */
  const init = () => {
    if (!document.getElementById('toast-container')) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed bottom-24 md:bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100%-2rem)] mx-auto md:w-full';
      document.body.appendChild(toastContainer);
    } else {
      toastContainer = document.getElementById('toast-container');
    }
  };

  /**
   * Display a floating feedback Toast notification.
   * @param {string} message 
   * @param {string} type - 'success' | 'info' | 'warning' | 'error'
   */
  const showToast = (message, type = 'info') => {
    if (!toastContainer) init();

    const toast = document.createElement('div');
    toast.className = `transform translate-y-4 opacity-0 transition-all duration-350 pointer-events-auto flex items-center p-4 rounded-xl shadow-lg border backdrop-blur-md text-sm font-medium`;
    
    let bgClass = '';
    let iconHTML = '';
    switch (type) {
      case 'success':
        bgClass = 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
        iconHTML = '<i data-lucide="check-circle" class="w-5 h-5 mr-3 shrink-0"></i>';
        break;
      case 'warning':
        bgClass = 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400';
        iconHTML = '<i data-lucide="alert-triangle" class="w-5 h-5 mr-3 shrink-0"></i>';
        break;
      case 'error':
        bgClass = 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400';
        iconHTML = '<i data-lucide="x-circle" class="w-5 h-5 mr-3 shrink-0"></i>';
        break;
      default: // info
        bgClass = 'bg-brand-500/10 dark:bg-brand-500/20 border-brand-500/30 text-brand-600 dark:text-brand-400';
        iconHTML = '<i data-lucide="info" class="w-5 h-5 mr-3 shrink-0"></i>';
    }

    toast.className += ` ${bgClass}`;
    toast.innerHTML = `
      ${iconHTML}
      <span class="flex-1">${message}</span>
      <button class="ml-3 text-current opacity-60 hover:opacity-100 transition-opacity" onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    toastContainer.appendChild(toast);
    lucide.createIcons({ attrs: { class: 'lucide-icon' } });

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'scale-95');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  };

  /**
   * Helper to parse YouTube ID for preview thumb
   * @param {string} url 
   */
  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  /**
   * Render dynamic Platform Icon with colors
   */
  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: { name: 'instagram', color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
      youtube: { name: 'youtube', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
      twitter: { name: 'twitter', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
      facebook: { name: 'facebook', color: 'text-blue-600 bg-blue-600/10 border-blue-600/20' },
      reddit: { name: 'message-square', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
      github: { name: 'github', color: 'text-slate-800 dark:text-slate-200 bg-slate-500/10 border-slate-500/20' },
      linkedin: { name: 'linkedin', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
      figma: { name: 'figma', color: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20' },
      website: { name: 'globe', color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' },
      blog: { name: 'pen-tool', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
      article: { name: 'file-text', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
      pdf: { name: 'file-text', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
      documentation: { name: 'code', color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
      custom: { name: 'link', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' }
    };
    return icons[platform] || icons.custom;
  };

  /**
   * Maps progress values to badges colors
   */
  const getProgressMeta = (progress) => {
    const metas = {
      0: { text: 'Not Started', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', bar: 'bg-rose-500' },
      25: { text: 'In Progress', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', bar: 'bg-amber-500' },
      50: { text: 'Halfway', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20', bar: 'bg-yellow-500' },
      75: { text: 'Nearly Done', color: 'text-sky-505 bg-sky-500/10 border-sky-500/20', bar: 'bg-sky-500' },
      100: { text: 'Completed', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-550' }
    };
    return metas[progress] || metas[0];
  };

  /**
   * Format relative timestamp
   */
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  /**
   * Highlight matching query text inside element string
   */
  const highlightText = (sourceText, query) => {
    if (!query || !sourceText) return sourceText || '';
    
    // Safely strip HTML tags if highlighting raw notes content to avoid breaking nested tags
    const cleanText = sourceText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return cleanText.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-800/60 text-slate-800 dark:text-slate-100">$1</mark>');
  };

  /**
   * Basic Markdown parser compiler
   */
  const parseMarkdown = (text) => {
    if (!text) return '';
    let html = '';
    let inList = false;
    let inCodeBlock = false;
    let codeBlockContent = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Code Blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          html += `<pre class="relative group"><code>${codeBlockContent.join('\n')}</code><button type="button" class="code-copy-btn opacity-0 group-hover:opacity-100 transition-opacity">Copy</button></pre>`;
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Unordered Lists
      const listMatch = line.match(/^[\-\*]\s+(.*)/);
      if (listMatch) {
        if (!inList) {
          inList = true;
          html += '<ul class="list-disc pl-4">';
        }
        html += `<li>${parseInlineMarkdown(listMatch[1])}</li>`;
        continue;
      } else {
        if (inList) {
          inList = false;
          html += '</ul>';
        }
      }

      // Headings
      const hMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (hMatch) {
        const level = hMatch[1].length;
        html += `<h${level} class="font-bold border-b border-slate-100 dark:border-slate-800 pb-1 mt-3 mb-2">${parseInlineMarkdown(hMatch[2])}</h${level}>`;
        continue;
      }

      // Blank Line
      if (line.trim() === '') {
        html += '<p class="h-2"></p>';
        continue;
      }

      // Standard text line
      html += `<p>${parseInlineMarkdown(line)}</p>`;
    }

    if (inList) html += '</ul>';
    return html;
  };

  const parseInlineMarkdown = (text) => {
    let out = text;
    // Escape tags
    out = out.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Bold: **text**
    out = out.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    // Italics: *text*
    out = out.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    // Underline: __text__
    out = out.replace(/__([^__]+)__/g, '<u>$1</u>');
    // Code inline: `code`
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links: [label](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-brand-600 dark:text-brand-400 underline font-semibold">$1</a>');

    return out;
  };

  /**
   * Render statistics and analytics on the Dashboard view
   */
  const renderDashboard = (links) => {
    const total = links.length;
    const read = links.filter(l => l.readStatus === 'read').length;
    const unread = total - read;
    const favorites = links.filter(l => l.favorite).length;
    const learning = links.filter(l => l.currentLearning).length;
    const queue = links.filter(l => typeof l.queueOrder === 'number').length;

    const completionPct = total > 0 ? Math.round((read / total) * 100) : 0;

    // Update counter cards
    document.getElementById('total-links-count').innerText = total;
    document.getElementById('read-links-count').innerText = read;
    document.getElementById('unread-links-count').innerText = unread;
    document.getElementById('favorite-links-count').innerText = favorites;
    document.getElementById('learning-links-count').innerText = learning;
    document.getElementById('queue-completion-text').innerText = `${queue} Items`;

    // Overall Progress Bar
    const completionBar = document.getElementById('dashboard-completion-bar');
    const completionText = document.getElementById('dashboard-completion-text');
    if (completionBar && completionText) {
      completionBar.style.width = `${completionPct}%`;
      completionText.innerText = `${completionPct}% Complete`;
    }

    // Platform Distribution Charts
    renderPlatformBreakdown(links);
    
    // SVG Donut Chart for Platforms
    renderDonutChart(links);

    // Completion Progress Stages Bars
    renderProgressAnalytics(links);

    // Dynamic 30-Day Activity Heatmap
    renderHeatmap();

    // Render recently viewed & Continue Learning card
    renderRecentlyViewed(links);
    renderContinueLearningCard(links);
  };

  /**
   * Platform distribution SVG Donut Chart
   */
  const renderDonutChart = (links) => {
    const container = document.getElementById('analytics-platforms-chart');
    const legendContainer = document.getElementById('analytics-platforms-legend');
    if (!container || !legendContainer) return;

    if (links.length === 0) {
      container.innerHTML = '<div class="text-3xs text-slate-400">No data</div>';
      legendContainer.innerHTML = '';
      return;
    }

    // Group platform counts
    const platformCounts = {};
    links.forEach(l => {
      platformCounts[l.platform] = (platformCounts[l.platform] || 0) + 1;
    });

    const colors = {
      youtube: '#ef4444',
      instagram: '#ec4899',
      twitter: '#0ea5e9',
      facebook: '#2563eb',
      reddit: '#f97316',
      website: '#14b8a6',
      blog: '#f59e0b',
      article: '#10b981',
      pdf: '#f43f5e',
      documentation: '#8b5cf6',
      custom: '#64748b'
    };

    const dataset = Object.entries(platformCounts).map(([platform, val]) => ({
      label: platform,
      value: val,
      color: colors[platform] || colors.custom
    })).sort((a,b) => b.value - a.value);

    // Calculate segments positions
    const total = links.length;
    let accumulatedPct = 0;
    
    let svgHTML = `<svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">`;
    svgHTML += `<circle cx="50" cy="50" r="38" fill="none" class="stroke-slate-100 dark:stroke-slate-800" stroke-width="12"/>`;

    dataset.forEach(item => {
      const pct = item.value / total;
      const strokeLength = pct * 2 * Math.PI * 38;
      const strokeOffset = accumulatedPct * 2 * Math.PI * 38;
      
      svgHTML += `<circle cx="50" cy="50" r="38" fill="none" stroke="${item.color}" stroke-width="12" 
        class="donut-segment" data-platform="${item.label}" data-pct="${pct}" data-count="${item.value}"
        stroke-dasharray="${strokeLength} ${2 * Math.PI * 38}" 
        stroke-dashoffset="${-strokeOffset}" 
        stroke-linecap="round"/>`;

      accumulatedPct += pct;
    });
    
    svgHTML += `<circle cx="50" cy="50" r="28" class="fill-white dark:fill-slate-900" />`;
    svgHTML += `<text x="50" y="47" text-anchor="middle" class="fill-slate-500 dark:fill-slate-400 text-[6px] font-bold uppercase tracking-wider" id="donut-center-label">Platforms</text>`;
    svgHTML += `<text x="50" y="56" text-anchor="middle" class="fill-slate-800 dark:fill-slate-100 text-[10px] font-extrabold" id="donut-center-value">${links.length}</text>`;
    svgHTML += `</svg>`;

    container.innerHTML = svgHTML;

    // Attach segment mouse handlers
    const segments = container.querySelectorAll('.donut-segment');
    const centerLabel = container.querySelector('#donut-center-label');
    const centerVal = container.querySelector('#donut-center-value');
    
    segments.forEach(seg => {
      seg.addEventListener('mouseenter', () => {
        const plat = seg.getAttribute('data-platform');
        const pct = Math.round(parseFloat(seg.getAttribute('data-pct')) * 100);
        const count = seg.getAttribute('data-count');
        if (centerLabel && centerVal) {
          centerLabel.textContent = plat === 'pdf' ? 'PDF' : plat;
          centerVal.textContent = `${pct}% (${count})`;
        }
      });
      
      seg.addEventListener('mouseleave', () => {
        if (centerLabel && centerVal) {
          centerLabel.textContent = 'Platforms';
          centerVal.textContent = links.length;
        }
      });
    });

    // Render Legends
    legendContainer.innerHTML = dataset.map(item => {
      const pct = Math.round((item.value / total) * 100);
      return `
        <div class="flex items-center justify-between py-0.5 border-b border-slate-50 dark:border-slate-850">
          <span class="flex items-center gap-1.5 min-w-0 pr-1">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${item.color}"></span>
            <span class="capitalize truncate text-slate-700 dark:text-slate-300 font-semibold">${item.label}</span>
          </span>
          <span class="shrink-0 text-slate-400">${pct}% (${item.value})</span>
        </div>
      `;
    }).join('');
  };

  /**
   * Renders completion progress stages distribution horizontal bars
   */
  const renderProgressAnalytics = (links) => {
    const container = document.getElementById('analytics-progress-chart');
    if (!container) return;

    const total = links.length;
    if (total === 0) {
      container.innerHTML = '<div class="text-center text-3xs text-slate-400 py-6">No data</div>';
      return;
    }

    // Collate progress buckets
    const progressBuckets = { 0: 0, 25: 0, 50: 0, 75: 0, 100: 0 };
    links.forEach(l => {
      const prog = l.progress !== undefined ? l.progress : 0;
      progressBuckets[prog] = (progressBuckets[prog] || 0) + 1;
    });

    const dataset = [0, 25, 50, 75, 100].map(val => {
      const count = progressBuckets[val];
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const meta = getProgressMeta(val);
      return { val, count, pct, meta };
    });

    container.innerHTML = dataset.map(item => `
      <div class="flex flex-col">
        <div class="flex items-center justify-between text-2xs mb-1 font-bold">
          <span class="text-slate-650 dark:text-slate-350">${item.meta.text} (${item.val}%)</span>
          <span class="text-slate-400">${item.count} items (${item.pct}%)</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div class="${item.meta.bar} h-full rounded-full transition-all duration-700" style="width: ${item.pct}%"></div>
        </div>
      </div>
    `).join('');
  };

  /**
   * Render dynamic GitHub-like 30-day activity heatmap
   */
  const renderHeatmap = async () => {
    const monthlyHeatmap = document.getElementById('analytics-monthly-heatmap');
    const weeklyHeatmap = document.getElementById('streak-heatmap-grid');
    const summaryText = document.getElementById('analytics-heatmap-summary');
    if (!monthlyHeatmap) return;

    try {
      const logs = await PKMStore.getActivityLogs();
      
      // Index activities by day
      const activityByDay = {};
      logs.forEach(log => {
        const dateStr = new Date(log.timestamp).toDateString();
        activityByDay[dateStr] = (activityByDay[dateStr] || 0) + 1;
      });

      // 1. Render 30 Day Monthly Grid
      const now = new Date();
      let monthlyHTML = '';
      let totalActivitiesLastMonth = 0;

      for (let d = 29; d >= 0; d--) {
        const checkDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        const dateStr = checkDate.toDateString();
        const count = activityByDay[dateStr] || 0;
        totalActivitiesLastMonth += count;

        // Color buckets
        let colorClass = 'bg-slate-100 dark:bg-slate-800 border border-slate-205/10 dark:border-slate-700/50';
        if (count > 0 && count <= 2) colorClass = 'bg-brand-600/30';
        else if (count > 2 && count <= 5) colorClass = 'bg-brand-600/60';
        else if (count > 5) colorClass = 'bg-brand-650';

        monthlyHTML += `<div class="heatmap-square ${colorClass} w-5 h-5 rounded" data-tooltip-text="${checkDate.toLocaleDateString()}: ${count} activities"></div>`;
      }
      monthlyHeatmap.innerHTML = monthlyHTML;
      if (summaryText) {
        summaryText.innerText = `${totalActivitiesLastMonth} activities logged in past 30 days`;
      }

      // 2. Render 7 Day Weekly Grid
      if (weeklyHeatmap) {
        let weeklyHTML = '';
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        for (let d = 6; d >= 0; d--) {
          const checkDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
          const dateStr = checkDate.toDateString();
          const count = activityByDay[dateStr] || 0;
          const dayLabel = dayNames[checkDate.getDay()];

          let colorClass = 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500';
          if (count > 0) {
            colorClass = 'bg-amber-500 text-white font-extrabold shadow-sm shadow-amber-500/20';
          }

          weeklyHTML += `
            <div class="flex flex-col items-center gap-1 flex-1">
              <div class="weekly-block w-7 h-7 rounded-lg flex items-center justify-center text-3xs font-semibold uppercase tracking-wider ${colorClass}" data-tooltip-text="${checkDate.toLocaleDateString()}: ${count} activities">
                ${dayLabel}
              </div>
            </div>
          `;
        }
        weeklyHeatmap.innerHTML = weeklyHTML;
      }

      // Attach floating tooltips listeners
      const tooltipElements = [];
      monthlyHeatmap.querySelectorAll('.heatmap-square').forEach(el => tooltipElements.push(el));
      if (weeklyHeatmap) {
        weeklyHeatmap.querySelectorAll('.weekly-block').forEach(el => tooltipElements.push(el));
      }
      
      tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
          const txt = el.getAttribute('data-tooltip-text');
          if (txt) showFloatingTooltip(el, txt);
        });
        el.addEventListener('mouseleave', () => {
          hideFloatingTooltip();
        });
      });
    } catch (err) {
      console.error("Heatmap rendering error:", err);
    }
  };

  /**
   * Platform Statistics Breakdown Table Grid (Legacy, but let's keep it below charts)
   */
  const renderPlatformBreakdown = (links) => {
    const platformGrid = document.getElementById('platform-breakdown-grid');
    if (!platformGrid) return;
    const total = links.length;

    if (total === 0) {
      platformGrid.innerHTML = `
        <div class="col-span-full py-8 text-center text-slate-400 dark:text-slate-500">
          No platform statistics available. Add some links to get started!
        </div>
      `;
      return;
    }

    const counts = {};
    links.forEach(l => {
      counts[l.platform] = (counts[l.platform] || 0) + 1;
    });

    const sortedPlatforms = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    platformGrid.innerHTML = sortedPlatforms.map(([platform, count]) => {
      const pct = Math.round((count / total) * 100);
      const meta = getPlatformIcon(platform);
      return `
        <div class="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-105 dark:border-slate-800 transition-all hover:translate-y-[-2px]">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <span class="p-2 rounded-lg border ${meta.color} mr-2">
                <i data-lucide="${meta.name}" class="w-4 h-4"></i>
              </span>
              <span class="capitalize font-semibold text-slate-700 dark:text-slate-300 text-sm">${platform === 'pdf' ? 'PDF' : platform}</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400 dark:text-slate-550">${count} links</span>
              <span class="block text-sm font-bold text-slate-800 dark:text-slate-200">${pct}%</span>
            </div>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div class="bg-brand-650 dark:bg-brand-500 h-full rounded-full transition-all duration-700" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  };

  /**
   * Render the sidebar / bottom panel for recently viewed items
   */
  const renderRecentlyViewed = (links) => {
    const container = document.getElementById('recently-viewed-list');
    if (!container) return;

    const recent = links
      .filter(l => l.lastOpened)
      .sort((a, b) => b.lastOpened - a.lastOpened)
      .slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 dark:text-slate-550 text-sm">
          No recently viewed links. Start browsing your library!
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(l => {
      const meta = getPlatformIcon(l.platform);
      return `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-105 dark:hover:border-slate-800/80 transition-all group">
          <div class="flex items-center min-w-0 mr-2 flex-1">
            <span class="p-2 rounded-lg border ${meta.color} mr-3 shrink-0">
              <i data-lucide="${meta.name}" class="w-4 h-4"></i>
            </span>
            <div class="min-w-0">
              <a href="${l.url}" target="_blank" data-id="${l.id}" class="recent-link-anchor text-sm font-bold text-slate-750 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 truncate block">
                ${l.title}
              </a>
              <span class="text-xs text-slate-400 dark:text-slate-500 flex items-center mt-0.5">
                <i data-lucide="clock" class="w-3.5 h-3.5 mr-1"></i>
                Opened ${formatRelativeTime(l.lastOpened)}
              </span>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity">
            <button class="favorite-toggle-btn p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all" data-id="${l.id}">
              <i data-lucide="heart" class="w-4.5 h-4.5 ${l.favorite ? 'fill-rose-500 text-rose-500' : ''}"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons({ attrs: { class: 'lucide-icon' } });
  };

  /**
   * Resume Learning card update
   */
  const renderContinueLearningCard = (links) => {
    const card = document.getElementById('continue-learning-widget');
    const title = document.getElementById('resume-title');
    const platform = document.getElementById('resume-platform');
    const posTag = document.getElementById('resume-position-tag');
    const bar = document.getElementById('resume-progress-bar');
    const actionBtn = document.getElementById('resume-action-btn');
    const accessedTxt = document.getElementById('resume-last-accessed');

    if (!card) return;

    // Find last opened item
    const opened = links
      .filter(l => l.lastOpened)
      .sort((a, b) => b.lastOpened - a.lastOpened);

    if (opened.length === 0) {
      // Hide position/bar info, show default text
      title.innerText = "No resources opened yet";
      platform.innerText = "None";
      platform.className = "text-3xs px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-full font-bold uppercase";
      posTag.classList.add('hidden');
      bar.style.width = '0%';
      actionBtn.disabled = true;
      accessedTxt.innerText = '';
      return;
    }

    const target = opened[0];
    const platMeta = getPlatformIcon(target.platform);
    
    title.innerText = target.title;
    platform.innerText = target.platform;
    platform.className = `text-3xs px-2 py-0.5 border rounded-full font-extrabold uppercase ${platMeta.color}`;
    
    if (target.learningPosition) {
      posTag.classList.remove('hidden');
      posTag.innerText = `Pos: ${target.learningPosition}`;
    } else {
      posTag.classList.add('hidden');
    }

    bar.style.width = `${target.progress || 0}%`;
    actionBtn.disabled = false;
    actionBtn.setAttribute('data-url', target.url);
    actionBtn.setAttribute('data-id', target.id);
    accessedTxt.innerText = `Opened ${formatRelativeTime(target.lastOpened)}`;
  };

  /**
   * Renders the Learning Queue section inside dashboard
   */
  const renderLearningQueue = (queueItems) => {
    const nextUpContainer = document.getElementById('queue-next-up-card');
    const listContainer = document.getElementById('queue-items-list');

    if (!nextUpContainer || !listContainer) return;

    // 1. Render Next Up highlighted item
    if (queueItems.length === 0) {
      nextUpContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center p-4">
          <i data-lucide="sparkles" class="w-8 h-8 text-brand-400 mb-2"></i>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-350">Queue Empty</span>
          <p class="text-3xs text-slate-400 mt-1 max-w-[150px]">Add bookmarks to your learning queue to organize your milestones.</p>
        </div>
      `;
      listContainer.innerHTML = `
        <div class="text-center py-10 text-slate-400 dark:text-slate-550 text-sm">
          No items in queue. Mark resources "Add to Queue" inside the bookmark form.
        </div>
      `;
      return;
    }

    // Top item
    const nextItem = queueItems[0];
    const nextMeta = getPlatformIcon(nextItem.platform);
    nextUpContainer.innerHTML = `
      <div>
        <span class="text-3xs font-extrabold text-brand-650 dark:text-brand-400 uppercase tracking-wider block mb-2 flex items-center"><i data-lucide="zap" class="w-3.5 h-3.5 mr-1 shrink-0"></i> Next Up In Queue</span>
        <h4 class="text-sm font-extrabold text-slate-850 dark:text-slate-100 line-clamp-2 leading-snug mb-2">${nextItem.title}</h4>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-3xs px-2 py-0.5 border rounded-full font-bold uppercase ${nextMeta.color}">${nextItem.platform}</span>
          ${nextItem.learningPosition ? `<span class="text-3xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500">${nextItem.learningPosition}</span>` : ''}
        </div>
      </div>
      <button class="queue-open-next-btn w-full h-10 bg-brand-650 hover:bg-brand-750 text-white rounded-lg text-xs font-bold shadow-md active:scale-95 transition-all mt-4 flex items-center justify-center gap-1" data-url="${nextItem.url}" data-id="${nextItem.id}">
        <i data-lucide="play" class="w-3.5 h-3.5 fill-white"></i> Start Learning
      </button>
    `;

    // 2. Render remaining reorderable list
    listContainer.innerHTML = queueItems.map((item, index) => {
      const meta = getPlatformIcon(item.platform);
      const isCompleted = item.progress === 100;
      return `
        <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-all gap-3">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <!-- Mark Complete inside queue list -->
            <button class="queue-complete-toggle-btn p-1 text-slate-350 hover:text-emerald-500 shrink-0" data-id="${item.id}" title="Mark Complete">
              <i data-lucide="check-circle" class="w-5 h-5 ${isCompleted ? 'text-emerald-555 fill-emerald-500/10' : ''}"></i>
            </button>
            
            <div class="min-w-0">
              <a href="${item.url}" target="_blank" data-id="${item.id}" class="queue-item-anchor text-xs font-bold text-slate-750 dark:text-slate-200 hover:text-brand-650 truncate block">
                ${item.title}
              </a>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-3xs font-extrabold uppercase text-slate-400">${item.platform}</span>
                <span class="text-3xs text-slate-400 font-bold">•</span>
                <span class="text-3xs text-slate-400 font-bold">Progress: ${item.progress || 0}%</span>
              </div>
            </div>
          </div>

          <!-- Reorder buttons + Remove -->
          <div class="flex items-center gap-1 shrink-0">
            <button class="queue-move-up-btn p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 active:scale-90 transition-transform ${index === 0 ? 'opacity-40 pointer-events-none' : ''}" data-id="${item.id}" title="Move Up">
              <i data-lucide="arrow-up" class="w-3.5 h-3.5"></i>
            </button>
            <button class="queue-move-down-btn p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 active:scale-90 transition-transform ${index === queueItems.length - 1 ? 'opacity-40 pointer-events-none' : ''}" data-id="${item.id}" title="Move Down">
              <i data-lucide="arrow-down" class="w-3.5 h-3.5"></i>
            </button>
            <button class="queue-remove-btn p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all ml-1" data-id="${item.id}" title="Remove from Queue">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons({ attrs: { class: 'lucide-icon' } });
  };

  /**
   * Render dynamic search suggestions dropdown list
   */
  const renderSearchSuggestions = (suggestions) => {
    const dropdown = document.getElementById('search-suggestions-dropdown');
    if (!dropdown) return;

    if (suggestions.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    dropdown.classList.remove('hidden');
    dropdown.innerHTML = suggestions.map(item => {
      const meta = getPlatformIcon(item.platform);
      return `
        <button class="search-suggestion-item w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3 text-xs font-semibold" data-id="${item.id}">
          <span class="truncate flex items-center min-w-0 pr-1">
            <i data-lucide="${meta.name}" class="w-3.5 h-3.5 mr-2 shrink-0 text-slate-400"></i>
            <span class="truncate">${item.title}</span>
          </span>
          <span class="text-3xs text-slate-400 shrink-0 font-extrabold uppercase border px-1.5 py-0.5 rounded">${item.platform}</span>
        </button>
      `;
    }).join('');

    lucide.createIcons({ attrs: { class: 'lucide-icon' } });
  };

  /**
   * Render dynamic card items in Library/Learning Trackers
   * @param {Array<Object>} links - filtered links to show
   * @param {string} targetContainerId - ID of DOM injection point
   * @param {string} layoutMode - 'grid' | 'list'
   * @param {Array<string>} selectedIds - current multi-selected cards
   */
  const renderLinkCards = (links, targetContainerId, layoutMode = 'grid', selectedIds = []) => {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    if (links.length === 0) {
      container.className = "flex flex-col items-center justify-center py-16 text-center";
      container.innerHTML = `
        <div class="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550 mb-4 animate-bounce">
          <i data-lucide="inbox" class="w-12 h-12"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-700 dark:text-slate-350 mb-1">No items found</h3>
        <p class="text-slate-500 dark:text-slate-400 max-w-sm text-sm">Create a new bookmark or adjust your current filter settings to view your collection.</p>
      `;
      lucide.createIcons({ attrs: { class: 'lucide-icon' } });
      return;
    }

    if (layoutMode === 'grid') {
      container.className = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6";
    } else {
      container.className = "flex flex-col gap-4";
    }

    container.innerHTML = links.map(link => {
      const isSelected = selectedIds.includes(link.id);
      const meta = getPlatformIcon(link.platform);
      const progMeta = getProgressMeta(link.progress !== undefined ? link.progress : 0);
      const ytId = getYouTubeId(link.url);
      
      // Thumbnail Render
      let thumbnailHTML = '';
      if (layoutMode === 'grid') {
        if (ytId) {
          thumbnailHTML = `
            <div class="relative aspect-video w-full overflow-hidden bg-slate-900 shrink-0">
              <img src="https://img.youtube.com/vi/${ytId}/mqdefault.jpg" alt="${link.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
              <div class="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                <span class="p-3 bg-red-600 rounded-full shadow-lg text-white">
                  <i data-lucide="play" class="w-5 h-5 fill-white"></i>
                </span>
              </div>
            </div>
          `;
        }
      }

      // Title & Notes highlights
      const highlightedTitle = highlightText(link.title, currentSearchQuery);
      const highlightedNotes = highlightText(link.notes || '', currentSearchQuery);

      const tagsHTML = link.tags.map(tag => `
        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-100/50 dark:border-brand-900/30">
          #${highlightText(tag, currentSearchQuery)}
        </span>
      `).join('');

      let sublinksHTML = '';
      if (link.subLinks && link.subLinks.length > 0) {
        const subLinksItems = link.subLinks.map(sub => `
          <a href="${sub.url}" target="_blank" data-id="${link.id}" class="sublink-anchor flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-brand-50/50 dark:bg-slate-850/40 dark:hover:bg-brand-950/20 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all">
            <span class="truncate pr-2 flex items-center">
              <i data-lucide="corner-down-right" class="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"></i>
              ${sub.label || 'Sub-link'}
            </span>
            <i data-lucide="external-link" class="w-3.5 h-3.5 text-slate-400"></i>
          </a>
        `).join('');

        sublinksHTML = `
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <button class="w-full h-10 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.chevron-icon').classList.toggle('rotate-180')">
              <span>Sub-links (${link.subLinks.length})</span>
              <i data-lucide="chevron-down" class="chevron-icon w-4 h-4 transition-transform"></i>
            </button>
            <div class="hidden flex flex-col gap-1.5 mt-2 transition-all">
              ${subLinksItems}
            </div>
          </div>
        `;
      }

      let nextSuggestHTML = '';
      if (link.nextSuggestedLink) {
        nextSuggestHTML = `
          <div class="mt-3 bg-slate-50 dark:bg-slate-850/30 p-2.5 rounded-lg border border-dashed border-brand-200 dark:border-brand-900/50 flex items-center justify-between text-xs">
            <span class="text-slate-500 dark:text-slate-400 truncate pr-2 font-medium">
              <strong class="text-brand-600 dark:text-brand-400">Next:</strong> ${link.nextSuggestedLink}
            </span>
            <a href="${link.nextSuggestedLink}" target="_blank" data-id="${link.id}" class="recent-link-anchor text-slate-450 hover:text-brand-600 dark:hover:text-brand-400 shrink-0 p-1">
              <i data-lucide="external-link" class="w-4 h-4"></i>
            </a>
          </div>
        `;
      }

      if (layoutMode === 'grid') {
        return `
          <div class="platform-card platform-${link.platform} group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border ${isSelected ? 'border-brand-600 dark:border-brand-500 ring-2 ring-brand-600/20' : 'border-slate-200/80 dark:border-slate-800'} shadow-sm hover:shadow-xl transition-all duration-300 flex-1 overflow-hidden" data-link-id="${link.id}">
            
            ${ytId ? `
            <div class="absolute top-3.5 left-3.5 z-20">
              <input type="checkbox" class="bulk-select-checkbox w-[18px] h-[18px] rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 focus:ring-2 bg-white dark:bg-slate-800 cursor-pointer shadow-sm transition-all" data-id="${link.id}" ${isSelected ? 'checked' : ''} />
            </div>
            ` : ''}

            ${thumbnailHTML}

            <div class="p-5 flex-1 flex flex-col justify-between ${ytId ? 'pt-4' : 'pt-5'}">
              <div>
                <!-- Clean Top Header row -->
                <div class="flex items-center justify-between gap-3 mb-4">
                  ${!ytId ? `
                  <div class="flex items-center gap-2.5">
                    <input type="checkbox" class="bulk-select-checkbox shrink-0" data-id="${link.id}" ${isSelected ? 'checked' : ''} />
                    <span class="p-2 rounded-xl border ${meta.color} shadow-sm bg-white dark:bg-slate-900/50 flex items-center justify-center">
                      <i data-lucide="${meta.name}" class="w-4 h-4"></i>
                    </span>
                    <span class="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize tracking-wide">${link.platform === 'pdf' ? 'PDF' : link.platform}</span>
                  </div>
                  ` : `
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.color} capitalize">
                    ${link.platform === 'pdf' ? 'PDF' : link.platform}
                  </span>
                  `}

                  <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span class="px-2 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase border ${progMeta.color}">
                      ${progMeta.text}
                    </span>
                    <button class="favorite-toggle-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all active:scale-90" data-id="${link.id}" aria-label="Favorite">
                      <i data-lucide="heart" class="w-4 h-4 ${link.favorite ? 'fill-rose-500 text-rose-500' : ''}"></i>
                    </button>
                    <button class="learning-toggle-btn p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-all active:scale-90" data-id="${link.id}" aria-label="Learning Status">
                      <i data-lucide="book-open" class="w-4 h-4 ${link.currentLearning ? 'text-amber-500 fill-amber-500' : ''}"></i>
                    </button>
                  </div>
                </div>

                <!-- Title & Notes -->
                <a href="${link.url}" target="_blank" data-id="${link.id}" class="card-main-anchor block text-base font-extrabold text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 leading-snug line-clamp-2 break-words mb-2 group-hover:underline decoration-brand-500/30 underline-offset-4">
                  ${highlightedTitle}
                </a>

                ${link.learningPosition ? `
                  <div class="mb-3">
                    <span class="inline-flex items-center text-[10px] font-extrabold text-brand-650 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-1 rounded-md border border-brand-100/50 dark:border-brand-900/50">
                      <i data-lucide="bookmark-check" class="w-3 h-3 mr-1.5"></i> Position: ${link.learningPosition}
                    </span>
                  </div>
                ` : ''}

                <div class="text-[13px] text-slate-500 dark:text-slate-450 line-clamp-3 mb-4 font-medium break-words leading-relaxed">
                  ${highlightedNotes || '<span class="italic opacity-60">No notes written...</span>'}
                </div>

                <!-- Tags -->
                ${tagsHTML ? `<div class="flex flex-wrap gap-1.5 mb-4">${tagsHTML}</div>` : ''}
              </div>

              <!-- Footer with Glassmorphic feel -->
              <div class="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                <div class="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-4 shadow-inner">
                  <div class="${progMeta.bar} h-full transition-all duration-1000 ease-out" style="width: ${link.progress || 0}%"></div>
                </div>

                ${nextSuggestHTML}
                ${sublinksHTML}

                <div class="flex items-center justify-between text-slate-400 dark:text-slate-500 mt-2">
                  <div class="flex flex-col gap-0.5">
                    <span class="flex items-center text-[10px] font-bold uppercase tracking-wider"><i data-lucide="calendar" class="w-3 h-3 mr-1.5"></i> Added ${formatRelativeTime(link.dateAdded)}</span>
                    <span class="flex items-center text-[10px] font-bold uppercase tracking-wider"><i data-lucide="mouse-pointer-click" class="w-3 h-3 mr-1.5"></i> ${link.clickCount || 0} views</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <button class="read-toggle-btn flex items-center h-8 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 ${link.readStatus === 'read' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}" data-id="${link.id}">
                      <i data-lucide="check-circle" class="w-3.5 h-3.5 mr-1.5"></i>
                      ${link.readStatus === 'read' ? 'Read' : 'Unread'}
                    </button>

                    <button class="card-options-btn h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 active:scale-95 transition-all" data-id="${link.id}" aria-label="Options">
                      <i data-lucide="more-horizontal" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // List Layout Mode
        return `
          <div class="platform-card platform-${link.platform} group relative flex flex-col xs:flex-row bg-white dark:bg-slate-900 rounded-xl border ${isSelected ? 'border-brand-600 dark:border-brand-500 ring-2 ring-brand-600/20' : 'border-slate-200/80 dark:border-slate-800'} p-4 shadow-sm hover:shadow-md transition-all gap-3 xs:gap-4" data-link-id="${link.id}">
            
            <div class="shrink-0 flex items-center">
              <input type="checkbox" class="bulk-select-checkbox w-5 h-5 rounded border-slate-350 dark:border-slate-755 text-brand-600 focus:ring-brand-500 focus:ring-2 bg-white/95 dark:bg-slate-905/95 transition-all cursor-pointer" data-id="${link.id}" ${isSelected ? 'checked' : ''} />
            </div>

            <!-- Platform Icon -->
            <div class="shrink-0 p-2.5 rounded-xl border ${meta.color} self-start xs:self-center hidden sm:block">
              <i data-lucide="${meta.name}" class="w-5.5 h-5.5"></i>
            </div>

            <!-- Content Area -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1.5">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-extrabold border ${meta.color} capitalize">
                  ${link.platform === 'pdf' ? 'PDF' : link.platform}
                </span>
                <!-- Progress status indicator -->
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-extrabold border ${progMeta.color}">
                  ${progMeta.text} (${link.progress || 0}%)
                </span>
                ${link.learningPosition ? `
                  <span class="inline-flex items-center text-3xs font-bold text-brand-650 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100/50">
                    Pos: ${link.learningPosition}
                  </span>
                ` : ''}
                <span class="text-3xs text-slate-400 dark:text-slate-500 flex items-center">
                  <i data-lucide="calendar" class="w-3.5 h-3.5 mr-1 shrink-0"></i>
                  ${formatRelativeTime(link.dateAdded)}
                </span>
                <span class="text-3xs text-slate-400 dark:text-slate-500 flex items-center">
                  <i data-lucide="eye" class="w-3.5 h-3.5 mr-1 shrink-0"></i>
                  ${link.clickCount || 0} clicks
                </span>
              </div>

              <a href="${link.url}" target="_blank" data-id="${link.id}" class="card-main-anchor block text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 truncate">
                ${highlightedTitle}
              </a>

              <p class="text-xs text-slate-550 dark:text-slate-400 truncate max-w-2xl font-semibold mt-0.5">
                ${highlightedNotes || 'No notes.'}
              </p>

              <div class="flex flex-wrap gap-1 mt-2">
                ${tagsHTML}
              </div>

              <!-- List layout Sublinks / Suggested Links Accordions -->
              ${link.nextSuggestedLink || (link.subLinks && link.subLinks.length > 0) ? `
                <div class="mt-2.5 flex flex-col md:flex-row gap-2">
                  ${link.nextSuggestedLink ? `
                    <div class="bg-slate-50 dark:bg-slate-800/30 px-2 py-1 rounded border border-dashed border-brand-200 dark:border-brand-900/50 flex items-center text-3xs text-slate-500 dark:text-slate-400 font-semibold">
                      <strong class="text-brand-600 dark:text-brand-400 mr-1">Next:</strong> <span class="truncate max-w-[150px]">${link.nextSuggestedLink}</span>
                      <a href="${link.nextSuggestedLink}" target="_blank" data-id="${link.id}" class="recent-link-anchor text-slate-400 hover:text-brand-650 ml-1.5 p-0.5"><i data-lucide="external-link" class="w-3 h-3"></i></a>
                    </div>
                  ` : ''}
                  ${link.subLinks && link.subLinks.length > 0 ? `
                    <div class="flex items-center gap-1.5">
                      <button class="text-3xs font-bold text-slate-500 hover:text-slate-800 flex items-center h-8" onclick="this.nextElementSibling.classList.toggle('hidden')">
                        <span>Sublinks (${link.subLinks.length})</span>
                        <i data-lucide="chevron-down" class="w-3 h-3 ml-0.5"></i>
                      </button>
                      <div class="hidden flex gap-1 bg-slate-50 dark:bg-slate-800/30 p-1 rounded border border-slate-100 dark:border-slate-800">
                        ${link.subLinks.map(sub => `
                          <a href="${sub.url}" target="_blank" data-id="${link.id}" class="sublink-anchor px-1.5 py-0.5 rounded hover:bg-brand-50/80 dark:hover:bg-brand-950/20 text-3xs font-bold text-slate-605 dark:text-slate-300">
                            ${sub.label}
                          </a>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Quick Action Buttons -->
            <div class="shrink-0 flex items-center justify-end gap-1.5 border-t xs:border-t-0 border-slate-100 dark:border-slate-850 pt-2.5 xs:pt-0">
              <button class="favorite-toggle-btn h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-505 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all active:scale-90" data-id="${link.id}">
                <i data-lucide="heart" class="w-4.5 h-4.5 ${link.favorite ? 'fill-rose-500 text-rose-500' : ''}"></i>
              </button>

              <button class="learning-toggle-btn h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-all active:scale-90" data-id="${link.id}">
                <i data-lucide="book-open" class="w-4.5 h-4.5 ${link.currentLearning ? 'text-amber-500 fill-amber-500' : ''}"></i>
              </button>

              <button class="read-toggle-btn h-10 w-10 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${link.readStatus === 'read' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-455 hover:bg-slate-100'}" data-id="${link.id}">
                <i data-lucide="check-circle" class="w-4.5 h-4.5"></i>
              </button>

              <button class="card-options-btn h-10 w-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 active:scale-95" data-id="${link.id}">
                <i data-lucide="more-vertical" class="w-4.5 h-4.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    }).join('');

    lucide.createIcons({ attrs: { class: 'lucide-icon' } });
  };

  /**
   * Modal handling toggle utilities
   */
  const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex', 'opacity-0');
    modal.offsetHeight;
    modal.classList.remove('opacity-0');
    modal.querySelector('.modal-content')?.classList.remove('translate-y-4', 'scale-95');
    
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
    if (focusable.length > 0) focusable[0].focus();
  };

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal || modal.classList.contains('hidden')) return;

    modal.classList.add('opacity-0');
    modal.querySelector('.modal-content')?.classList.add('translate-y-4', 'scale-95');

    modal.addEventListener('transitionend', function handler() {
      modal.classList.add('hidden');
      modal.classList.remove('flex', 'opacity-0');
      modal.removeEventListener('transitionend', handler);
    });
  };

  /**
   * Dynamic Sub-link management fields
   */
  const addSubLinkInput = (container, label = '', url = '') => {
    const rowId = 'sublink-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const rowDiv = document.createElement('div');
    rowDiv.id = rowId;
    rowDiv.className = 'flex items-center gap-2 mb-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 animate-slide-in';
    
    rowDiv.innerHTML = `
      <input type="text" placeholder="Title/Label" value="${label}" class="sublink-label-input flex-1 px-3 h-10 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500" required />
      <input type="url" placeholder="URL" value="${url}" inputmode="url" autocorrect="off" autocapitalize="none" class="sublink-url-input flex-[2] px-3 h-10 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500" required />
      <button type="button" class="h-10 w-10 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-lg transition-colors shrink-0" onclick="document.getElementById('${rowId}').remove()">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(rowDiv);
    lucide.createIcons({ attrs: { class: 'lucide-icon' } });
  };

  const getSubLinksValues = (container) => {
    if (!container) return [];
    const rows = container.querySelectorAll('.animate-slide-in');
    const values = [];
    rows.forEach(row => {
      const label = row.querySelector('.sublink-label-input').value.trim();
      const url = row.querySelector('.sublink-url-input').value.trim();
      if (label && url) {
        values.push({ label, url });
      }
    });
    return values;
  };

  return {
    init,
    showToast,
    renderDashboard,
    renderLinkCards,
    renderLearningQueue,
    renderSearchSuggestions,
    openModal,
    closeModal,
    addSubLinkInput,
    getSubLinksValues,
    parseMarkdown,
    setSearchQuery: (q) => { currentSearchQuery = q; }
  };
})();

