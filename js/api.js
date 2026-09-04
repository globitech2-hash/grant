window.GWApi = (function () {
  var CACHE_KEY = "gw_users_cache";
  var DATA_URL = "data/users.json";

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.users)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache(users) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          users: users
        })
      );
    } catch (e) {
      /* storage full or unavailable; ignore */
    }
  }

  function normalize(json) {
    var users = null;
    if (Array.isArray(json)) users = json;
    else if (json && Array.isArray(json.users)) users = json.users;
    if (!users) throw new Error("Invalid data shape: expected { users: [] }");
    return users.filter(function (u) {
      return u && typeof u === "object" && u.id !== undefined && typeof u.email === "string";
    });
  }

  function safeParse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Malformed JSON in " + DATA_URL);
    }
  }

  function fetchFresh() {
    var url = DATA_URL + "?ts=" + Date.now();
    return fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " while loading " + DATA_URL);
        return res.text();
      })
      .then(function (text) {
        return normalize(safeParse(text));
      });
  }

  /**
   * Returns { users, source: "network" | "cache", fetchedAt: Date|null, error?: Error }.
   * Always attempts the network first (no-store, cache-busted); falls back to the local cache.
   */
  function getUsers() {
    return fetchFresh().then(
      function (users) {
        writeCache(users);
        return { users: users, source: "network", fetchedAt: new Date(), error: null };
      },
      function (err) {
        var cached = readCache();
        if (cached) {
          return {
            users: cached.users,
            source: "cache",
            fetchedAt: cached.savedAt ? new Date(cached.savedAt) : null,
            error: err
          };
        }
        throw err;
      }
    );
  }

  function findUserById(users, id) {
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].id) === String(id)) return users[i];
    }
    return null;
  }

  function findUserByEmail(users, email) {
    var needle = String(email || "").trim().toLowerCase();
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].email || "").trim().toLowerCase() === needle) return users[i];
    }
    return null;
  }

  return {
    CACHE_KEY: CACHE_KEY,
    DATA_URL: DATA_URL,
    getUsers: getUsers,
    fetchFresh: fetchFresh,
    readCache: readCache,
    findUserById: findUserById,
    findUserByEmail: findUserByEmail
  };
})();
