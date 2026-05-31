// IndexedDB-backed file data store.
// Keeps large base64-encoded file blobs out of localStorage (which has a
// ~5 MB per-origin quota) and in IndexedDB, which supports hundreds of MB.

const DB_NAME = 'wasteid_files_v1'
const STORE_NAME = 'files'
const DB_VERSION = 1

let _db = null

function openDb() {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = (e) => {
      _db = e.target.result
      resolve(_db)
    }
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Persist a base64 data URL under the given key.
 * @param {string} key  e.g. "doc_5", "sds_3", "form_2"
 * @param {string} dataUrl  base64 data URL
 */
export async function setFileData(key, dataUrl) {
  if (!dataUrl || typeof indexedDB === 'undefined') return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Retrieve a previously stored data URL, or null if not found.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getFileData(key) {
  if (typeof indexedDB === 'undefined') return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = (e) => resolve(e.target.result ?? null)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Remove the data URL for the given key.
 * @param {string} key
 */
export async function deleteFileData(key) {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}
