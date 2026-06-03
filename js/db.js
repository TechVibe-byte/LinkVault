/**
 * PKMStore: Core Database Manager for Personal Knowledge Manager & Learning Tracker
 * Handles data persistence using browser IndexedDB.
 */
const PKMStore = (() => {
  const DB_NAME = 'PKMDatabase';
  const DB_VERSION = 2; // Upgraded schema version
  const STORE_NAME = 'links';
  const ACTIVITY_STORE = 'activity';
  let db = null;

  /**
   * Initializes IndexedDB database and object stores.
   * @returns {Promise<IDBDatabase>}
   */
  const init = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Database failed to open:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        console.log('Database initialized successfully (v' + DB_VERSION + ')');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        
        // 1. Links object store
        if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
          const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('favorite', 'favorite', { unique: false });
          store.createIndex('readStatus', 'readStatus', { unique: false });
          store.createIndex('currentLearning', 'currentLearning', { unique: false });
          store.createIndex('platform', 'platform', { unique: false });
          store.createIndex('dateAdded', 'dateAdded', { unique: false });
          store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          store.createIndex('lastOpened', 'lastOpened', { unique: false });
        }

        // 2. Activity object store (for streaks and analytics logs)
        if (!dbInstance.objectStoreNames.contains(ACTIVITY_STORE)) {
          const activityStore = dbInstance.createObjectStore(ACTIVITY_STORE, { keyPath: 'id', autoIncrement: true });
          activityStore.createIndex('timestamp', 'timestamp', { unique: false });
          activityStore.createIndex('linkId', 'linkId', { unique: false });
          activityStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  };

  /**
   * Get database instance. Ensure initialized.
   */
  const getDB = async () => {
    if (!db) {
      await init();
    }
    return db;
  };

  /**
   * Add a new link to the database.
   * @param {Object} linkData 
   * @returns {Promise<string>} Added link ID
   */
  const addLink = async (linkData) => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const id = 'link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const record = {
        id,
        title: linkData.title || 'Untitled Link',
        url: linkData.url,
        platform: linkData.platform || 'website',
        tags: Array.isArray(linkData.tags) ? linkData.tags : [],
        notes: linkData.notes || '',
        readStatus: linkData.readStatus || 'unread', // 'read' | 'unread'
        favorite: !!linkData.favorite,
        currentLearning: !!linkData.currentLearning,
        dateAdded: Date.now(),
        lastUpdated: Date.now(),
        lastOpened: null,
        clickCount: 0,
        nextSuggestedLink: linkData.nextSuggestedLink || '',
        subLinks: Array.isArray(linkData.subLinks) ? linkData.subLinks : [],
        
        // Advanced Features Fields
        progress: typeof linkData.progress === 'number' ? linkData.progress : 0, // 0, 25, 50, 75, 100
        learningPosition: linkData.learningPosition || '', // e.g. "Chapter 4" or "10:30 mins"
        queueOrder: typeof linkData.queueOrder === 'number' ? linkData.queueOrder : null // Position in Queue
      };

      const request = store.add(record);

      request.onsuccess = async () => {
        // Log action in activity log
        await logActivity('add', id);
        resolve(record);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Update an existing link in the database.
   * @param {string} id 
   * @param {Object} updatedFields 
   * @returns {Promise<Object>} Updated record
   */
  const updateLink = async (id, updatedFields) => {
    const dbInstance = await getDB();
    const currentRecord = await getLinkById(id);
    if (!currentRecord) throw new Error(`Link not found: ${id}`);

    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        ...currentRecord,
        ...updatedFields,
        lastUpdated: Date.now()
      };

      // Safeguard date fields
      if (!record.dateAdded) record.dateAdded = Date.now();

      const request = store.put(record);

      request.onsuccess = async () => {
        // If progress is completed, log action
        if (updatedFields.progress !== undefined && updatedFields.progress !== currentRecord.progress) {
          await logActivity('progress', id);
        }
        resolve(record);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Get a single link by ID.
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  const getLinkById = async (id) => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Delete a link by ID.
   * @param {string} id 
   * @returns {Promise<void>}
   */
  const deleteLink = async (id) => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Bulk delete links by IDs.
   * @param {Array<string>} ids 
   * @returns {Promise<void>}
   */
  const bulkDelete = async (ids) => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      ids.forEach((id) => {
        store.delete(id);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Fetch all links from the database.
   * @returns {Promise<Array<Object>>}
   */
  const getAllLinks = async () => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Increment the click counter for a link and log last opened timestamp.
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  const registerClick = async (id) => {
    const record = await getLinkById(id);
    if (!record) return null;

    // Log action in activity log
    await logActivity('open', id);

    return await updateLink(id, {
      clickCount: (record.clickCount || 0) + 1,
      lastOpened: Date.now()
    });
  };

  /**
   * Check if a URL already exists in the database.
   * Useful for duplicate URL warning.
   * @param {string} url 
   * @returns {Promise<Object|null>} Matching record if found
   */
  const checkDuplicateUrl = async (url) => {
    if (!url) return null;
    const cleanUrl = url.trim().toLowerCase();
    const all = await getAllLinks();
    return all.find((link) => link.url.trim().toLowerCase() === cleanUrl) || null;
  };

  /**
   * Log User learning activities to calculate streaks and analytics.
   * @param {string} type - 'open' | 'progress' | 'add'
   * @param {string} linkId 
   */
  const logActivity = async (type, linkId) => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([ACTIVITY_STORE], 'readwrite');
      const store = transaction.objectStore(ACTIVITY_STORE);

      const record = {
        type,
        linkId,
        timestamp: Date.now()
      };

      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Fetch all logs.
   * @returns {Promise<Array<Object>>}
   */
  const getActivityLogs = async () => {
    const dbInstance = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([ACTIVITY_STORE], 'readonly');
      const store = transaction.objectStore(ACTIVITY_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Save Queue positions bulk order
   * @param {Array<string>} orderedIds 
   */
  const updateQueuePositions = async (orderedIds) => {
    const dbInstance = await getDB();
    const all = await getAllLinks();
    
    return new Promise((resolve, reject) => {
      const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      all.forEach(link => {
        const queueIdx = orderedIds.indexOf(link.id);
        const newOrder = queueIdx !== -1 ? queueIdx : null;
        
        if (link.queueOrder !== newOrder) {
          const updated = {
            ...link,
            queueOrder: newOrder,
            lastUpdated: Date.now()
          };
          store.put(updated);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  };

  /**
   * Backup data - Export all records to a JSON file.
   * @returns {Promise<string>} JSON string
   */
  const exportBackup = async () => {
    const allLinks = await getAllLinks();
    const allActivity = await getActivityLogs();
    const backupData = {
      version: DB_VERSION,
      exportedAt: Date.now(),
      data: {
        links: allLinks,
        activity: allActivity
      }
    };
    return JSON.stringify(backupData, null, 2);
  };

  /**
   * Restore data - Import records from a backup JSON string.
   * @param {string} jsonString 
   * @returns {Promise<{added: number, skipped: number}>}
   */
  const importBackup = async (jsonString) => {
    const parsed = JSON.parse(jsonString);
    if (!parsed || (!parsed.data && !Array.isArray(parsed.data))) {
      throw new Error('Invalid backup file format');
    }

    // Support legacy (v1) formats where parsed.data was just the array of links
    const incomingLinks = Array.isArray(parsed.data) ? parsed.data : (parsed.data.links || []);
    const incomingActivity = parsed.data.activity || [];

    const dbInstance = await getDB();
    const existing = await getAllLinks();
    const existingUrls = new Set(existing.map((item) => item.url.toLowerCase().trim()));
    
    let addedCount = 0;
    let skippedCount = 0;

    return new Promise((resolve, reject) => {
      // 1. Transaction to restore Links
      const transaction = dbInstance.transaction([STORE_NAME, ACTIVITY_STORE], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const actStore = transaction.objectStore(ACTIVITY_STORE);

      incomingLinks.forEach((item) => {
        if (!item.url) {
          skippedCount++;
          return;
        }

        const cleanUrl = item.url.toLowerCase().trim();
        if (existingUrls.has(cleanUrl)) {
          skippedCount++;
          return;
        }

        const id = item.id || ('link_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        
        const record = {
          id,
          title: item.title || 'Imported Link',
          url: item.url,
          platform: item.platform || 'website',
          tags: Array.isArray(item.tags) ? item.tags : [],
          notes: item.notes || '',
          readStatus: item.readStatus || 'unread',
          favorite: !!item.favorite,
          currentLearning: !!item.currentLearning,
          dateAdded: item.dateAdded || Date.now(),
          lastUpdated: item.lastUpdated || Date.now(),
          lastOpened: item.lastOpened || null,
          clickCount: item.clickCount || 0,
          nextSuggestedLink: item.nextSuggestedLink || '',
          subLinks: Array.isArray(item.subLinks) ? item.subLinks : [],
          
          progress: typeof item.progress === 'number' ? item.progress : (item.readStatus === 'read' ? 100 : 0),
          learningPosition: item.learningPosition || '',
          queueOrder: typeof item.queueOrder === 'number' ? item.queueOrder : null
        };

        store.add(record);
        existingUrls.add(cleanUrl);
        addedCount++;
      });

      // 2. Restore activity logs
      incomingActivity.forEach((act) => {
        const record = {
          type: act.type || 'open',
          linkId: act.linkId,
          timestamp: act.timestamp || Date.now()
        };
        actStore.add(record);
      });

      transaction.oncomplete = () => {
        resolve({ added: addedCount, skipped: skippedCount });
      };

      transaction.onerror = (e) => {
        reject(e.target.error);
      };
    });
  };

  return {
    init,
    addLink,
    updateLink,
    deleteLink,
    bulkDelete,
    getAllLinks,
    getLinkById,
    registerClick,
    checkDuplicateUrl,
    logActivity,
    getActivityLogs,
    updateQueuePositions,
    exportBackup,
    importBackup
  };
})();
