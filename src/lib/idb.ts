export const openDB = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('PharmaSecureDB', 1);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sales_queue')) {
                db.createObjectStore('sales_queue', { keyPath: 'idempotencyKey' });
            }
            if (!db.objectStoreNames.contains('products_cache')) {
                db.createObjectStore('products_cache', { keyPath: '_id' });
            }
        };

        request.onsuccess = (event: any) => resolve(event.target.result);
        request.onerror = (event: any) => reject(event.target.error);
    });
};

export const saveToQueue = async (saleData: any) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sales_queue', 'readwrite');
        const store = tx.objectStore('sales_queue');
        store.put(saleData);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const getPendingSales = async (): Promise<any[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sales_queue', 'readonly');
        const store = tx.objectStore('sales_queue');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const removePendingSale = async (idempotencyKey: string) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sales_queue', 'readwrite');
        const store = tx.objectStore('sales_queue');
        store.delete(idempotencyKey);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const cacheProducts = async (products: any[]) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('products_cache', 'readwrite');
        const store = tx.objectStore('products_cache');
        store.clear();
        products.forEach(p => store.put(p));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
};

export const getCachedProducts = async (): Promise<any[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('products_cache', 'readonly');
        const store = tx.objectStore('products_cache');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};
