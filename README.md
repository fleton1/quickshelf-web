# QuickShelf Web

**Progressive Web App** version of QuickShelf for hand-scanner barcode inventory management.

## Features

- **ADD mode**: Scan barcodes with a hand scanner → select shelf → fill in details (description, qty, labels, etc.)
- **FIND mode**: Search inventory, mark items complete (✓), delete items (✕)
- **SHEETS**: Select items → print or save count sheet PDF with pre-filled data
- **Themes**: 6 color themes (⚙ icon in top-right corner)
- **Settings**: Configure number of shelves + custom shelf names
- **CLEAR**: Delete all inventory items
- **Offline support**: Works without internet connection via PWA
- **Installable**: Can be installed on desktop/mobile like a native app

## How Hand Scanners Work

Hand scanners act as **keyboard input devices**. When you scan a barcode:
1. The scanner "types" the barcode digits
2. Sends an Enter key press
3. The app captures the input and processes it

No camera, no permissions, just simple keyboard input.

## Quick Start

### Local Development

1. **Serve the files** (any static server works):
   ```bash
   # Python 3
   python3 -m http.server 8000

   # Node.js (with http-server)
   npx http-server -p 8000

   # PHP
   php -S localhost:8000
   ```

2. **Open in browser**: http://localhost:8000

3. **Test without scanner**: Just type a barcode in the input field and press Enter

### Production Deployment

Deploy to any static hosting:

#### **Netlify** (easiest)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### **GitHub Pages**
```bash
# Push to gh-pages branch
git checkout -b gh-pages
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# Enable in repo settings → Pages → Source: gh-pages branch
```

#### **Vercel**
```bash
npm install -g vercel
vercel --prod
```

#### **Self-hosted**
Copy all files to your web server directory (Apache, Nginx, etc.)

## Using the App

### ADD Items
1. Click **ADD**
2. Focus the input field (it should auto-focus)
3. Scan barcode with hand scanner (or type + Enter for testing)
4. Click the shelf where item is located
5. Fill in detail fields:
   - **Description**: Item description
   - **Discrepancy Label/Bag**: Label or bag number
   - **Qty**: Quantity
   - **Labels**: Number of labels printed
   - **OB Labels**: Overstock bin labels
   - **Comments**: Additional notes
6. Click **SAVE** (or CANCEL to go back)

### FIND Items
1. Click **FIND**
2. Type to search (searches as you type)
3. Results show barcode + shelf location
4. Click **✓** to mark complete (turns green)
5. Click **✕** to delete (with confirmation)

### Settings
1. Click **SETTINGS**
2. Change number of shelves (1-20)
3. Add custom shelf names (e.g., "Overstock", "Warehouse B")
4. Remove custom shelves
5. Click **SAVE**

### Count Sheets
1. Click **SHEETS**
2. Filter items if needed
3. Select items to include (checkboxes)
4. Click **SELECT ALL** / **DESELECT ALL** to toggle all
5. Choose action:
   - **PRINT** - Opens print dialog directly
   - **SAVE PDF** - Downloads PDF file

The PDF is landscape letter format with 11 columns matching the Android app:
- ✓, Part Number, Description, Discrepancy Label/Bag, Comments, PPLET #, Qty, Labels, OB Labels, Time Started, Time Finished
- **Database fields are pre-filled** (description, qty, labels, etc.)
- Blank fields are left empty for manual entry
- Alternating row colors for easy reading
- Ready for laser printer

### Themes
1. Click the **⚙** icon in the top-right corner
2. Choose from 6 themes:
   - **Retro Beige** - Warm cream background, muted browns
   - **Dark Navy** - Deep navy (default)
   - **Forest** - Dark green with teal accents
   - **Slate** - Cool blue-grey
   - **Sunset** - Rich brown with warm orange
   - **Pastel Pink** - Soft pink with sage and periwinkle
3. Theme preference saved automatically

### Backup & Restore
1. Click **SETTINGS**
2. Scroll to "Backup & Restore" section
3. **Export Backup**:
   - Downloads `quickshelf-backup-YYYY-MM-DD.json`
   - Contains all items + settings
   - Keep this file safe!
4. **Import Backup**:
   - Select JSON backup file
   - Confirms before replacing all data
   - Restores everything from backup

**Recommended**: Export backup regularly, especially before clearing data

### Clear All
1. Click **CLEAR**
2. Confirm twice (safety)
3. All items deleted

## Technical Details

- **Storage**: IndexedDB (browser database, no server needed)
- **Offline**: Service Worker caches all files
- **Framework**: Vanilla JavaScript (minimal dependencies)
- **PDF Generation**: jsPDF + autoTable plugin
- **Styling**: Custom CSS, dark theme
- **PWA**: Manifest + service worker for installability

## Browser Support

Works on all modern browsers:
- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+
- Mobile browsers (iOS Safari, Chrome Android)

## Data Persistence

- All data stored **locally** in IndexedDB
- No cloud sync (single-device only)
- Data persists across browser restarts
- Clearing browser data will delete inventory

## Future Enhancements

Possible additions:
- [x] Export/import data (JSON) - **DONE**
- [ ] Multi-device sync (backend + API)
- [ ] Barcode printing
- [ ] Categories/tags
- [ ] Statistics/reports
- [ ] Bluetooth scanner support

## Differences from Android App

| Feature | Android | Web |
|---------|---------|-----|
| Scanner | Camera (ZXing) | Hand scanner (keyboard) |
| Storage | SQLite | IndexedDB |
| Count Sheet | ✅ PDF generation | ✅ PDF generation |
| Offline | Native | PWA (service worker) |
| Install | APK | Browser install prompt |
| Platform | Android only | Any device with browser |

## License

Same as QuickShelf Android - for Angie's inventory management.
