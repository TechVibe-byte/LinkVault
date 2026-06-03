# 🛡️ LinkVault

> Your decentralized, offline-first personal knowledge manager and active learning tracker. Bookmarks, notes, and progress logs — all stored securely in your browser.

[![PWA Support](https://img.shields.io/badge/PWA-Ready-success?logo=progressive-web-apps&logoColor=white&style=flat-square)](#offline-support)
[![IndexedDB Persistence](https://img.shields.io/badge/Persistence-IndexedDB%20%26%20LocalStorage-blue?logo=googlechrome&logoColor=white&style=flat-square)](#data-storage)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](#license)

LinkVault is a modern, privacy-focused client-side application designed to catalog, organize, and study educational content from across the web. Whether you are tracking documentation, blog posts, YouTube video timelines, or Instagram educational threads, LinkVault keeps your goals organized with interactive dashboards, learning streaks, and markdown-enabled progress notes.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [Theme Support](#theme-support)
- [Mobile Support](#mobile-support)
- [Offline Support](#offline-support)
- [Data Storage](#data-storage)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)
- [Acknowledgements](#acknowledgements)

---

## 🌟 Overview

As the volume of online learning material grows, capturing, organizing, and actually *completing* bookmarks becomes increasingly difficult. Standard bookmark managers lack structural contexts for videos (like timestamped sub-links) and fail to provide progression states or note-taking capabilities. 

LinkVault was created to bridge this gap. It operates **100% in your browser**, requiring:
- ❌ No user registration or login
- ❌ No backend database servers
- ❌ No constant internet connection
- ❌ No tracking scripts

By leveraging high-performance local APIs (**IndexedDB** and **LocalStorage**), your personal library remains your private data, stored exclusively on your device.

---

## ✨ Features

LinkVault is loaded with capabilities to streamline your learning loop:

| Category | Feature Name | Description |
| :--- | :--- | :--- |
| **Capture** | 🔗 Multi-Platform Saving | Custom categorization for YouTube, Instagram, Twitter/X, Reddit, Blogs, PDFs, Documentation, and Websites. |
| | 📂 YT & IG Sub-links | Save multiple sub-links (e.g., source repositories, timestamped sections, worksheets) inside a single bookmark. |
| **Organize** | 🏷️ Tags & Notes | Tag items for search categorization and keep rich notes using a Markdown engine. |
| | ❤️ Favorite System | Quickly toggle favorite status to pin key references. |
| **Track** | 📈 Progress Tracking | Track completions across 5 levels: Not Started (0%), In Progress (25%), Halfway (50%), Nearly Done (75%), and Completed (100%). |
| | 🎯 Learning Queue | Reorder upcoming bookmarks with up/down arrows to manage your "Next Up" priorities. |
| | ⚡ Learning Streaks | Gamified streak metric logs consecutive days of learning activity to build consistent habits. |
| **Interface** | 🌓 Zero-Flicker Themes | Smooth transition light and dark modes with system preference sync, loading instantly without white-screen flashes. |
| | 🎨 Accent Themes | Select custom accent styles (Indigo, Violet, Emerald, Rose, Amber) to personalize your workspace. |
| | 📱 Mobile-First Design | 100% responsive interface adjusting smoothly from 320px screens up to ultra-wide desktop monitors. |
| **Utility** | 🔍 Real-Time Highlight Search | Matches query text inside titles, notes, and tags, highlighting matches dynamically. |
| | 💾 JSON Import/Export | Backup your collection and activity logs into validated JSON files for safe migration. |
| | 📦 PWA Offline Capabilities | Cache files via service worker for complete offline boot-up and application usage. |

---

## 📸 Screenshots

*Include visual representations of LinkVault's interface below:*

#### 🖥️ Desktop Dashboard Overview
```
+-------------------------------------------------------+
|  LinkVault   |  [Resume Learning]    [ Streak Flame ] |
|  [Library]   |  Opened: 2m ago       Current: 5 Days  |
|  [Learning]  |  -----------------    ================ |
|              |                                        |
|  [Export]    |  Platform Share       Activity Heatmap |
|  [Import]    |  (SVG Donut Chart)    [ ][X][ ][ ][X]  |
+-------------------------------------------------------+
```
*(Placeholder for Desktop Dashboard screenshot)*

#### 📱 Mobile Navigation Drawer & Grid
```
+-------------------+
| = LinkVault   (☀️)|
| +-----------------+
| | [YouTube Card]  |
| | Title, Tags     |
| | Progress: 50%   |
| +-----------------+
| | [Article Card]  |
| | Title, Tags     |
| +-----------------+
| |    [ (+) FAB ]  |
+-------------------+
```
*(Placeholder for Mobile UI screenshot)*

---

## 🛠️ Tech Stack

LinkVault is engineered with zero external framework dependencies to remain fast, light, and secure:

* **Markup**: [HTML5](https://developer.mozilla.org/en-US/docs/Web/HTML) (Semantic layouts, dialog structures)
* **Styling**: [Tailwind CSS (via Play CDN)](https://tailwindcss.com) (Utility-first styling, CSS custom variables)
* **Logic**: [Vanilla JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (Event delegation, modular structure)
* **Persistence**: [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (Large object storage for links and logs) and [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) (Fast UI state preference flags)
* **Offline Operations**: [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) (Network-fallback-cache caching)
* **Icons**: [Lucide Icons](https://lucide.dev) (Responsive SVG icons)

---

## 🚀 Installation

Because LinkVault runs purely on client-side code, running it locally is incredibly simple:

### Method 1: Double-Click (Simple)
1. Download or clone this repository.
2. Navigate to the root directory.
3. Double-click [index.html](file:///C:/Users/saich/.gemini/antigravity-ide/scratch/personal-knowledge-manager/index.html) to open the application directly in your web browser.

### Method 2: Local Server (Recommended for PWA Install features)
To support Progressive Web App install prompts, the app must be served under a local hostname. You can use any lightweight static server:

Using **Node.js**'s `http-server`:
```bash
# Clone the repository
git clone https://github.com/your-username/linkvault.git

# Navigate into the project folder
cd linkvault

# Serve the directory
npx http-server ./
```
Open `http://localhost:8080` inside your web browser.

---

## 📖 Usage Guide

### ➕ Adding Links
1. Click the **Add New Bookmark** button (or press `N` on your keyboard).
2. Enter the URL. The system will automatically detect the platform (e.g. YouTube, Instagram, Medium, Substack).
3. If a duplicate URL is detected, an alert will highlight the existing match. You can override and select "Save Anyway" if desired.
4. Input details: Title, Tags (separated by commas), Notes, and current progress status.

### 📝 Managing Sub-Links (YouTube & Instagram)
1. When selecting "YouTube" or "Instagram" as the platform, extra input fields will dynamically show.
2. Use **Next Suggested Link** to map the next step in your curriculum.
3. Click **Add Another Sub-Link** to specify child targets (like source codes, homework PDFs, or timestamp links).
4. Save the bookmark. In the library card, click "Sub-links" to expand or collapse this checklist drawer.

### 🔍 Searching Content
- Tap the search bar (or press `/` on your keyboard) to focus.
- Type any title, tag, notes, or URL. Results filter instantly as you type.
- Typing letters also prompts the **Suggestions Dropdown**, listing the top 5 closest matches. Click a suggestion to edit it immediately.
- Matching text queries will highlight inside card components in gold `<mark>` tags.

### 🎯 Tracking Learning Progress
- Update card progress states using the **Unread / Read** button toggle or edit the card to specify a completion value (0%, 25%, 50%, 75%, 100%).
- Log your progress position (e.g. "Page 42" or "14:10 mins") in the **Learning Position** field. The dashboard's "Resume Learning" card will display your last accessed position.

### 📥 Exporting & Importing Data
- **Backup**: Click the **Download** (Export JSON) button in the sidebar. This downloads a backup file containing your complete library list and daily logs.
- **Restore**: Click the **Upload** (Import JSON) button and select your JSON file. The system will validate the schema, import new bookmarks, and filter duplicate entries automatically.

---

## 📁 Project Structure

```text
personal-knowledge-manager/
├── assets/
│   └── icon.svg              # App icon asset (maskable SVG)
├── js/
│   ├── app.js                # Core app controller & event router
│   ├── db.js                 # IndexedDB store schemas & transactions
│   ├── shortcuts.js          # Keyboard shortcut triggers
│   ├── theme.js              # Dark Mode & Accent Color handlers
│   └── ui.js                 # Render templates, SVG charts & markdown parser
├── index.html                # HTML5 structure & entry point
├── index.css                 # Custom prose stylings & micro-animations
├── manifest.json             # PWA installation manifest configuration
└── sw.js                     # Service Worker offline asset caching rules
```

---

## 🌓 Theme Support

LinkVault features native theme settings optimized for developers:
- **Zero-Flicker**: A blocker script evaluates `localStorage.getItem('pkm_theme')` synchronously in the `<head>` of the DOM before rendering body structures. This eliminates the white flash common to dark-mode script integrations.
- **Theme Cycle**: Tap the Sun/Moon icons in sidebars to cycle options: Light ➡️ Dark ➡️ System Sync.
- **Personalized Accents**: Switch the primary brand color to match your environment via the colored circle picker widgets in sidebars.

---

## 📱 Mobile Support

LinkVault utilizes a mobile-first responsive layout matching diverse user viewports:
- **Hamburger Menu & Drawer**: Desktop navigation slides off-screen on mobile devices, replaced by a thumb-friendly bottom drawer navigation bar and expandable hamburger configurations.
- **Touch Targets**: Standard links are mapped to a minimum target index height of `44px` to minimize typing errors.
- **No Zoom Forms**: Inputs are set to `text-base` (16px) to bypass iOS safari automatic viewport page zooms when input fields focus.

---

## 🔌 Offline Support

Thanks to the PWA framework, LinkVault is fully functional offline:
- The Service Worker (`sw.js`) intercepts request protocols, storing critical assets (HTML, CSS, JS, Tailwind scripts, and Google Fonts) into cache buckets.
- If no internet is detected, LinkVault loads immediately from the service worker cache.
- Data queries read and write straight to IndexedDB, synchronizing local edits on next reload.

---

## 💾 Data Storage

LinkVault relies on local storage layers:
- **LocalStorage**: Handles lightweight preference settings: active layout configurations, color theme states, accent theme choices, and temporary note drafts.
- **IndexedDB**: Handles structured data objects:
  - `links`: Key-value store indexing titles, platforms, tags, notes, dates, sub-links, and queue hierarchies.
  - `activity`: Timestamp logs recording additions, updates, and open click events.

---

## 🗺️ Future Enhancements

Potential features planned for future updates:
- [ ] **Custom Category Icons**: Upload personalized vector graphics for custom platform selections.
- [ ] **Tag Color Managers**: Assign custom background gradients to individual tag labels.
- [ ] **PDF Reader Overlay**: Load offline PDFs directly inside a split-pane reader dashboard.
- [ ] **Automatic Metadata Scraper**: Parse public link headers to fetch titles and summaries automatically (requires optional backend proxy).

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**Your Name / Portfolio**
- GitHub: [@TechVibe-byte](https://github.com/TechVibe-byte)

---

## 💖 Acknowledgements

Special thanks to the libraries and resources that power LinkVault:
- [Tailwind CSS Play CDN](https://tailwindcss.com) - Fast CSS utility configurations.
- [Lucide Icons](https://lucide.dev) - Beautiful, open-source vector icon set.
- [Google Fonts (Outfit & Plus Jakarta Sans)](https://fonts.google.com) - Premium modern typography.
