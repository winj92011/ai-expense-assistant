(() => {
  if (window.__persistenceAdapterInstalled) return;
  window.__persistenceAdapterInstalled = true;

  const DEFAULT_KEY = "ai-expense-assistant:persistence:v1";

  function parseJson(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function createLocalAdapter(options = {}) {
    const key = options.key || DEFAULT_KEY;
    const storage = options.storage || window.localStorage;

    return {
      mode: "local",
      key,
      save(data) {
        const payload = {
          ...data,
          persistedAt: data?.persistedAt || new Date().toISOString(),
          persistenceMode: "local",
        };
        storage.setItem(key, JSON.stringify(payload));
        return payload;
      },
      read() {
        return parseJson(storage.getItem(key));
      },
      clear() {
        storage.removeItem(key);
        return true;
      },
      describe() {
        return {
          mode: "local",
          key,
          databaseConnected: false,
          apiReady: false,
        };
      },
    };
  }

  function createApiAdapter(options = {}) {
    const fallback = createLocalAdapter(options);
    return {
      ...fallback,
      mode: "api",
      describe() {
        return {
          mode: "api",
          key: options.key || DEFAULT_KEY,
          databaseConnected: false,
          apiReady: false,
          fallback: "local",
        };
      },
    };
  }

  function createPersistenceAdapter(options = {}) {
    return options.mode === "api" ? createApiAdapter(options) : createLocalAdapter(options);
  }

  window.createPersistenceAdapter = createPersistenceAdapter;
  window.persistenceAdapter = createPersistenceAdapter({ key: DEFAULT_KEY });
})();
