// IndexedDB PDF Store for persistent storage of PDF files across pages and browser sessions
const DB_NAME = 'PortalPdfStore';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_blobs';

function openPdfDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Saves a PDF Blob or File to IndexedDB under a given key or filename.
 */
export async function savePdfBlob(key, blob) {
  if (!key || !blob) return false;
  try {
    const db = await openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('Failed to save PDF blob to IndexedDB:', e);
    return false;
  }
}

/**
 * Retrieves a PDF Blob from IndexedDB by key or filename.
 */
export async function getPdfBlob(key) {
  if (!key) return null;
  try {
    const db = await openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('Failed to retrieve PDF blob from IndexedDB:', e);
    return null;
  }
}

/**
 * Retrieves all stored PDF Blobs as an object map: { [key]: Blob }
 */
export async function getAllPdfBlobs() {
  try {
    const db = await openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = async () => {
        const keys = keysReq.result || [];
        const result = {};
        for (const k of keys) {
          const blobReq = store.get(k);
          await new Promise((res) => {
            blobReq.onsuccess = () => {
              if (blobReq.result) {
                result[k] = blobReq.result;
              }
              res();
            };
            blobReq.onerror = () => res();
          });
        }
        resolve(result);
      };
      keysReq.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('Failed to get all PDF blobs from IndexedDB:', e);
    return {};
  }
}

/**
 * Removes a PDF Blob from IndexedDB by key.
 */
export async function deletePdfBlob(key) {
  if (!key) return false;
  try {
    const db = await openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('Failed to delete PDF blob from IndexedDB:', e);
    return false;
  }
}
