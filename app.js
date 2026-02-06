// QuickShelf Web App
let db;
let currentBarcode = null;
let currentShelf = null;
let settings = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    db = new QuickShelfDB();
    await db.init();
    settings = await db.getSettings();

    loadTheme();
    setupEventListeners();
    registerServiceWorker();
});

function setupEventListeners() {
    // Theme picker
    document.getElementById('btnThemePicker').addEventListener('click', showThemePicker);
    document.getElementById('btnCloseTheme').addEventListener('click', closeThemePicker);
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => changeTheme(btn.dataset.theme));
    });

    // Main menu buttons
    document.getElementById('btnAdd').addEventListener('click', showAddMode);
    document.getElementById('btnFind').addEventListener('click', showFindMode);
    document.getElementById('btnSheets').addEventListener('click', showCountSheet);
    document.getElementById('btnSettings').addEventListener('click', showSettings);
    document.getElementById('btnClear').addEventListener('click', handleClear);

    // Add mode
    document.getElementById('scanInput').addEventListener('keypress', handleScan);
    document.getElementById('btnCancelAdd').addEventListener('click', showMainMenu);

    // Shelf picker
    document.getElementById('btnCancelShelf').addEventListener('click', showAddMode);

    // Details form
    document.getElementById('btnSaveDetails').addEventListener('click', saveItemDetails);
    document.getElementById('btnCancelDetails').addEventListener('click', showAddMode);

    // Find mode
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('btnCancelFind').addEventListener('click', showMainMenu);

    // Count sheet
    document.getElementById('countFilter').addEventListener('input', handleCountFilter);
    document.getElementById('btnSelectAll').addEventListener('click', toggleSelectAll);
    document.getElementById('btnPrintSheet').addEventListener('click', () => generateCountSheet(true));
    document.getElementById('btnSavePDF').addEventListener('click', () => generateCountSheet(false));
    document.getElementById('btnCancelCount').addEventListener('click', showMainMenu);

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
        btn.onclick = () => showDetailsForm(barcode, i.toString());
        grid.appendChild(btn);
    }

    // Add custom shelves
    settings.customShelves.forEach(shelfName => {
        const btn = document.createElement('button');
        btn.className = 'shelf-btn';
        btn.textContent = shelfName;
        btn.onclick = () => showDetailsForm(barcode, shelfName);
        grid.appendChild(btn);
    });
}

async function showDetailsForm(barcode, shelf) {
    currentBarcode = barcode;
    currentShelf = shelf;

    showScreen('detailsForm');
    document.getElementById('detailBarcode').textContent = barcode;
    document.getElementById('detailShelf').textContent = `Shelf: ${shelf}`;

    // Check if item exists and pre-fill
    const existingItem = await db.getItem(barcode);
    if (existingItem) {
        document.getElementById('inputDescription').value = existingItem.description || '';
        document.getElementById('inputDiscrepancy').value = existingItem.discrepancy || '';
        document.getElementById('inputQty').value = existingItem.qty || '';
        document.getElementById('inputLabels').value = existingItem.labels || '';
        document.getElementById('inputOBLabels').value = existingItem.ob_labels || '';
        document.getElementById('inputComments').value = existingItem.comments || '';
    } else {
        // Clear form for new item
        document.getElementById('inputDescription').value = '';
        document.getElementById('inputDiscrepancy').value = '';
        document.getElementById('inputQty').value = '';
        document.getElementById('inputLabels').value = '';
        document.getElementById('inputOBLabels').value = '';
        document.getElementById('inputComments').value = '';
    }

    // Focus first input
    document.getElementById('inputDescription').focus();
}

async function saveItemDetails() {
    const details = {
        description: document.getElementById('inputDescription').value.trim(),
        discrepancy: document.getElementById('inputDiscrepancy').value.trim(),
        qty: document.getElementById('inputQty').value.trim(),
        labels: document.getElementById('inputLabels').value.trim(),
        ob_labels: document.getElementById('inputOBLabels').value.trim(),
        comments: document.getElementById('inputComments').value.trim()
    };

    try {
        await db.saveItem(currentBarcode, currentShelf, details);
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

// Count sheet mode
let countSheetItems = [];
let countSheetSelected = new Set();

async function showCountSheet() {
    showScreen('countSheetMode');
    document.getElementById('countFilter').value = '';
    countSheetSelected.clear();
    await loadCountSheetItems();
}

async function loadCountSheetItems() {
    const query = document.getElementById('countFilter').value;
    countSheetItems = await db.searchItems(query);
    renderCountSheetItems();
}

function renderCountSheetItems() {
    const container = document.getElementById('countItemsContainer');

    if (countSheetItems.length === 0) {
        container.innerHTML = '<div class="empty-message">No items in inventory</div>';
        return;
    }

    container.innerHTML = countSheetItems.map(item => `
        <div class="count-item">
            <input
                type="checkbox"
                class="count-checkbox"
                data-barcode="${item.barcode}"
                ${countSheetSelected.has(item.barcode) ? 'checked' : ''}
                onchange="toggleCountItem('${item.barcode}')"
            >
            <div class="count-item-info">
                <div class="count-barcode">${item.barcode}</div>
                <div class="count-shelf">Shelf: ${item.shelf}</div>
            </div>
        </div>
    `).join('');

    updateSelectAllButton();
}

function toggleCountItem(barcode) {
    if (countSheetSelected.has(barcode)) {
        countSheetSelected.delete(barcode);
    } else {
        countSheetSelected.add(barcode);
    }
    updateSelectAllButton();
}

function toggleSelectAll() {
    if (countSheetSelected.size === countSheetItems.length) {
        // Deselect all
        countSheetSelected.clear();
    } else {
        // Select all
        countSheetSelected.clear();
        countSheetItems.forEach(item => countSheetSelected.add(item.barcode));
    }
    renderCountSheetItems();
}

function updateSelectAllButton() {
    const btn = document.getElementById('btnSelectAll');
    btn.textContent = countSheetSelected.size === countSheetItems.length
        ? 'DESELECT ALL'
        : 'SELECT ALL';
}

async function handleCountFilter() {
    await loadCountSheetItems();
}

async function generateCountSheet(printMode) {
    if (countSheetSelected.size === 0) {
        alert('Please select at least one item');
        return;
    }

    // Get selected items
    const selectedItems = countSheetItems.filter(item =>
        countSheetSelected.has(item.barcode)
    );

    // Generate PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'letter'
    });

    // Title
    doc.setFontSize(11);
    doc.text('NAME & Number: ___________________________', 50, 60);
    doc.text('DATE: _______________', 500, 60);

    // Table - pre-fill data from database
    const tableData = selectedItems.map(item => [
        '', // Checkbox column (empty for manual checking)
        item.barcode || '',
        item.description || '',
        item.discrepancy || '',
        item.comments || '',
        '', // PPLET # (always blank)
        item.qty || '',
        item.labels || '',
        item.ob_labels || '',
        '', // TIME STARTED (blank for manual entry)
        ''  // TIME FINISHED (blank for manual entry)
    ]);

    doc.autoTable({
        startY: 82,
        head: [[
            '✓',
            'PART NUMBER',
            'DESCRIPTION',
            'Discrepancy\nLabel/Bag',
            'COMMENTS',
            'PPLET #',
            'QTY',
            'LABELS',
            'OB Labels',
            'TIME\nSTARTED',
            'TIME\nFINISHED'
        ]],
        body: tableData,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.5
        },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
            fontSize: 7,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0]
        },
        alternateRowStyles: {
            fillColor: [230, 230, 230]
        },
        columnStyles: {
            0: { cellWidth: 18, halign: 'center' },   // ✓
            1: { cellWidth: 96, halign: 'left' },     // PART NUMBER
            2: { cellWidth: 110, halign: 'left' },    // DESCRIPTION
            3: { cellWidth: 93, halign: 'left' },     // Discrepancy
            4: { cellWidth: 106, halign: 'left' },    // COMMENTS
            5: { cellWidth: 43, halign: 'center' },   // PPLET #
            6: { cellWidth: 43, halign: 'center' },   // QTY
            7: { cellWidth: 50, halign: 'center' },   // LABELS
            8: { cellWidth: 50, halign: 'center' },   // OB Labels
            9: { cellWidth: 54, halign: 'center' },   // TIME STARTED
            10: { cellWidth: 55, halign: 'center' }   // TIME FINISHED
        },
        margin: { left: 37 }
    });

    if (printMode) {
        // Print mode - open print dialog
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
    } else {
        // Save mode - download PDF
        doc.save('count-sheet.pdf');
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

// Theme management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark-navy';
    document.body.className = savedTheme;
    updateActiveTheme(savedTheme);
}

function showThemePicker() {
    document.getElementById('themeModal').classList.add('active');
}

function closeThemePicker() {
    document.getElementById('themeModal').classList.remove('active');
}

function changeTheme(theme) {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
    updateActiveTheme(theme);
}

function updateActiveTheme(theme) {
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// Service Worker registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => console.log('Service Worker registered'))
            .catch(error => console.log('Service Worker registration failed:', error));
    }
}
