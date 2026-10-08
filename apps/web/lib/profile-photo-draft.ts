const DATABASE_NAME = "sia-profile-drafts";
const STORE_NAME = "files";
const PHOTO_KEY = "profile-photo";

function openDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDraftDatabase();
  return await new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
  });
}

export async function saveProfilePhotoDraft(photo: Blob) {
  await runTransaction("readwrite", (store) => store.put(photo, PHOTO_KEY));
}

export async function loadProfilePhotoDraft() {
  return await runTransaction<Blob | undefined>("readonly", (store) => store.get(PHOTO_KEY));
}

export async function clearProfilePhotoDraft() {
  await runTransaction("readwrite", (store) => store.delete(PHOTO_KEY));
}

const WIZARD_PHOTO_KEY = "wizard-photo";
export async function saveWizardPhotoDraft(photo: Blob, draftId: string) {
  await runTransaction("readwrite", (store) => store.put(photo, `${WIZARD_PHOTO_KEY}:${draftId}`));
}
export async function loadWizardPhotoDraft(draftId: string) {
  return await runTransaction<Blob | undefined>("readonly", (store) => store.get(`${WIZARD_PHOTO_KEY}:${draftId}`));
}
export async function clearWizardPhotoDraft(draftId: string) {
  await runTransaction("readwrite", (store) => store.delete(`${WIZARD_PHOTO_KEY}:${draftId}`));
}
