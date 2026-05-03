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
          persistenceMode: data?.persistenceMode || "local",
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
    const endpoint = options.endpoint || "/api/prototype/data-model-preview";

    async function requestJson(path, requestOptions = {}) {
      try {
        const response = await fetch(path, requestOptions);
        const text = await response.text();
        if (!response.ok || !text.trim()) return null;
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    return {
      mode: "api",
      key: fallback.key,
      endpoint,
      async save(data) {
        const payload = {
          ...data,
          persistedAt: data?.persistedAt || new Date().toISOString(),
          persistenceMode: "api",
        };
        const remote = await requestJson(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (remote?.snapshot) return remote.snapshot;
        return fallback.save({
          ...payload,
          persistenceMode: "api-fallback",
          fallbackReason: "api_unavailable",
        });
      },
      async read() {
        const remote = await requestJson(endpoint);
        if (remote?.snapshot) return remote.snapshot;
        if (remote?.model) return remote.model;
        return fallback.read();
      },
      async clear() {
        await requestJson(endpoint, { method: "DELETE" });
        return fallback.clear();
      },
      describe() {
        return {
          mode: "api",
          key: fallback.key,
          endpoint,
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
