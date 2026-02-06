// IndexedDB wrapper for QuickShelf
class QuickShelfDB {
    constructor() {
        this.dbName = 'quickshelf';
        this.version = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Create items store
                if (!db.objectStoreNames.contains('items')) {
                    const itemStore = db.createObjectStore('items', { keyPath: 'barcode' });
                    itemStore.createIndex('shelf', 'shelf', { unique: false });
                    itemStore.createIndex('completed', 'completed', { unique: false });
                }

                // Create settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Version 2: Add detail fields (migration not needed, fields are optional)
            };
        });
    }

    async saveItem(barcode, shelf, details = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');

            const item = {
                barcode: barcode,
                shelf: shelf,
                completed: 0,
                timestamp: Date.now(),
                description: details.description || '',
                discrepancy: details.discrepancy || '',
                qty: details.qty || '',
                labels: details.labels || '',
                ob_labels: details.ob_labels || '',
                comments: details.comments || ''
            };

            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getItem(barcode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.get(barcode);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchItems(query) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.getAll();

            request.onsuccess = () => {
                let items = request.result;

                // Filter by query if provided
                if (query && query.trim() !== '') {
                    const lowerQuery = query.toLowerCase();
                    items = items.filter(item =>
                        item.barcode.toLowerCase().includes(lowerQuery)
                    );
                }

                // Sort by timestamp (newest first)
                items.sort((a, b) => b.timestamp - a.timestamp);

                resolve(items);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async toggleComplete(barcode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');

            const getRequest = store.get(barcode);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    item.completed = item.completed === 1 ? 0 : 1;
                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resolve(item.completed);
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error('Item not found'));
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteItem(barcode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.delete(barcode);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('config');

            request.onsuccess = () => {
                const settings = request.result || {
                    key: 'config',
                    shelfCount: 8,
                    customShelves: ['Overstock']
                };
                resolve(settings);
            };

            request.onerror = () => reject(request.error);
        });
    }

    async saveSettings(settings) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');

            const config = {
                key: 'config',
                shelfCount: settings.shelfCount,
                customShelves: settings.customShelves
            };

            const request = store.put(config);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
