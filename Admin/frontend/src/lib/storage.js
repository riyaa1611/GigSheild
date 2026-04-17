const PREFIX = "gsa_";

export const storage = {
  get: (k, fallback = null) => {
    try {
      const r = localStorage.getItem(PREFIX + k);
      return r ? JSON.parse(r) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (k, v) => {
    localStorage.setItem(PREFIX + k, JSON.stringify(v));
  },
  clear: () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};
