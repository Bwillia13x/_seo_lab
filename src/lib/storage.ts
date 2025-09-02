// Local storage utilities

export function setStorageItem(key: string, value: any): void {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

export function getStorageItem<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue ?? null;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return defaultValue ?? null;
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing from localStorage:", error);
  }
}

export function clearStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error("Error clearing localStorage:", error);
  }
}

// Session storage utilities
export function setSessionItem(key: string, value: any): void {
  try {
    const serializedValue = JSON.stringify(value);
    sessionStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error("Error saving to sessionStorage:", error);
  }
}

export function getSessionItem<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue ?? null;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error("Error reading from sessionStorage:", error);
    return defaultValue ?? null;
  }
}

export const kv = {
  get<T>(k: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(k);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(k: string, v: T) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
