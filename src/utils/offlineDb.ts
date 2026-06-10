import type { Track, Area } from "../hooks/useRoutePlanner";

const DB_NAME = "summit_offline_db";
const DB_VERSION = 1;

export interface OfflineData {
  track: Track | null;
  areas: Area[];
  savedAt: number;
}

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Error opening IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      // Object store para la ruta activa y áreas
      if (!db.objectStoreNames.contains("active_route")) {
        db.createObjectStore("active_route", { keyPath: "id" });
      }
      // Object store para las descargas de mapas u metadatos
      if (!db.objectStoreNames.contains("map_downloads")) {
        db.createObjectStore("map_downloads", { keyPath: "id" });
      }
    };
  });
}

export async function saveActiveRoute(track: Track | null, areas: Area[]): Promise<void> {
  try {
    const db = await initDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("active_route", "readwrite");
      const store = transaction.objectStore("active_route");

      const data: OfflineData & { id: string } = {
        id: "current_active",
        track,
        areas,
        savedAt: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to save active route to IndexedDB:", err);
  }
}

export async function loadActiveRoute(): Promise<OfflineData | null> {
  try {
    const db = await initDb();
    return new Promise<OfflineData | null>((resolve, reject) => {
      const transaction = db.transaction("active_route", "readonly");
      const store = transaction.objectStore("active_route");
      const request = store.get("current_active");

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to load active route from IndexedDB:", err);
    return null;
  }
}

export async function clearActiveRoute(): Promise<void> {
  try {
    const db = await initDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("active_route", "readwrite");
      const store = transaction.objectStore("active_route");
      const request = store.delete("current_active");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to clear active route from IndexedDB:", err);
  }
}
