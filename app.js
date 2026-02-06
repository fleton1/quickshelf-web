// QuickShelf Web App
let db;
let currentBarcode = null;
let settings = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    db = new QuickShelfDB();
    await db.init();
    settings = await db.getSettings();

    setupEventListeners();
    registerServiceWorker();
});

function setupEventListeners() {
    // Main menu buttons
    document.getElementById('btnAdd').addEventListener('click', showAddMode);
    document.getElementById('btnFind').addEventListener('click', showFindMode);
    document.getElementById('btnSettings').addEventListener('click', showSettings);
    document.getElementById('btnClear').addEventListener('click', handleClear);

    // Add mode
    document.getElementById('scanInput').addEventListener('keypress', handleScan);
    document.getElementById('btnCancelAdd').addEventListener('click', showMainMenu);

    // Shelf picker
    document.getElementById('btnCancelShelf').addEventListener('click', showAddMode);

    // Find mode
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('btnCancelFind').addEventListener('click', showMainMenu);

    // Settings
    document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
    document.getElementById('btnAddCustomShelf').addEventListener('click', addCustomShelf);
    document.getElementById('btnCancelSettings').addEventListener('click', showMainMenu);
}

// Screen navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen, .menu').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showMainMenu() {
    showScreen('mainMenu');
}

function showAddMode() {
    showScreen('addMode');
    document.getElementById('scanInput').value = '';
    document.getElementById('scanInput').focus();
}

function showFindMode() {
    showScreen('findMode');
    document.getElementById('searchInput').value = '';
    document.getElementById('searchInput').focus();
    handleSearch(); // Show all items initially
}

async function showSettings() {
    showScreen('settingsMode');
    settings = await db.getSettings();
    document.getElementById('shelfCount').value = settings.shelfCount;
    renderCustomShelves();
}

// Add mode - hand scanner input
function handleScan(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const barcode = e.target.value.trim();

        if (barcode) {
            currentBarcode = barcode;
            showShelfPicker(barcode);
        }

        e.target.value = '';
    }
}

async function showShelfPicker(barcode) {
    showScreen('shelfPicker');
    document.getElementById('currentBarcode').textContent = barcode;

    const grid = document.getElementById('shelfGrid');
    grid.innerHTML = '';

    // Add numbered shelves
    for (let i = 1; i <= settings.shelfCount; i++) {
        const btn = document.createElement('button');
        btn.className = 'shelf-btn';
        btn.textContent = `Shelf ${i}`;
        btn.onclick = () => saveToShelf(barcode, i.toString());
        grid.appendChild(btn);
    }

    // Add custom shelves
    settings.customShelves.forEach(shelfName => {
        const btn = document.createElement('button');
        btn.className = 'shelf-btn';
        btn.textContent = shelfName;
        btn.onclick = () => saveToShelf(barcode, shelfName);
        grid.appendChild(btn);
    });
}

async function saveToShelf(barcode, shelf) {
    try {
        await db.saveItem(barcode, shelf);
        showAddMode();
    } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
    }
}

// Find mode - search and display
async function handleSearch() {
    const query = document.getElementById('searchInput').value;
    const items = await db.searchItems(query);
    renderResults(items);
}

function renderResults(items) {
    const container = document.getElementById('resultsContainer');

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-message">No items found</div>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="result-item ${item.completed ? 'completed' : ''}" data-barcode="${item.barcode}">
            <div class="result-info">
                <div class="result-barcode">${item.barcode}</div>
                <div class="result-shelf">Shelf: ${item.shelf}</div>
            </div>
            <div class="result-actions">
                <button class="icon-btn check" onclick="toggleComplete('${item.barcode}')">
                    ${item.completed ? '↺' : '✓'}
                </button>
                <button class="icon-btn delete" onclick="confirmDelete('${item.barcode}')">✕</button>
            </div>
        </div>
    `).join('');
}

async function toggleComplete(barcode) {
    try {
        await db.toggleComplete(barcode);
        await handleSearch(); // Refresh results
    } catch (error) {
        console.error('Error toggling complete:', error);
        alert('Error updating item: ' + error.message);
    }
}

function confirmDelete(barcode) {
    if (confirm(`Delete item ${barcode}?`)) {
        deleteItem(barcode);
    }
}

async function deleteItem(barcode) {
    try {
        await db.deleteItem(barcode);
        await handleSearch(); // Refresh results
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item: ' + error.message);
    }
}

// Clear all
function handleClear() {
    if (confirm('Delete ALL items? This cannot be undone!')) {
        if (confirm('Are you REALLY sure? All inventory data will be lost!')) {
            clearAll();
        }
    }
}

async function clearAll() {
    try {
        await db.clearAll();
        alert('All items cleared');
    } catch (error) {
        console.error('Error clearing items:', error);
        alert('Error clearing items: ' + error.message);
    }
}

// Settings management
async function saveSettings() {
    const shelfCount = parseInt(document.getElementById('shelfCount').value);

    if (shelfCount < 1 || shelfCount > 20) {
        alert('Shelf count must be between 1 and 20');
        return;
    }

    settings.shelfCount = shelfCount;

    try {
        await db.saveSettings(settings);
        alert('Settings saved');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings: ' + error.message);
    }
}

async function addCustomShelf() {
    const input = document.getElementById('newShelfName');
    const name = input.value.trim();

    if (!name) {
        alert('Please enter a shelf name');
        return;
    }

    if (settings.customShelves.includes(name)) {
        alert('Shelf already exists');
        return;
    }

    settings.customShelves.push(name);

    try {
        await db.saveSettings(settings);
        input.value = '';
        renderCustomShelves();
    } catch (error) {
        console.error('Error adding custom shelf:', error);
        alert('Error adding shelf: ' + error.message);
    }
}

async function removeCustomShelf(name) {
    if (confirm(`Remove shelf "${name}"?`)) {
        settings.customShelves = settings.customShelves.filter(s => s !== name);

        try {
            await db.saveSettings(settings);
            renderCustomShelves();
        } catch (error) {
            console.error('Error removing shelf:', error);
            alert('Error removing shelf: ' + error.message);
        }
    }
}

function renderCustomShelves() {
    const container = document.getElementById('customShelvesList');

    if (settings.customShelves.length === 0) {
        container.innerHTML = '<div class="empty-message">No custom shelves</div>';
        return;
    }

    container.innerHTML = settings.customShelves.map(name => `
        <div class="custom-shelf-item">
            <span>${name}</span>
            <button onclick="removeCustomShelf('${name}')">Remove</button>
        </div>
    `).join('');
}

// Service Worker registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => console.log('Service Worker registered'))
            .catch(error => console.log('Service Worker registration failed:', error));
    }
}
