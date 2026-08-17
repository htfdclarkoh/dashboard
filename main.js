const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- CONFIGURE LOGGING ---
// Updates will be logged to: 
// %USERPROFILE%\AppData\Roaming\HTFD76 DB\logs\main.log
log.transports.file.level = 'info';
autoUpdater.logger = log;

// --- FIX AUTOPLAY POLICY ---
// This switch forces Chrome to allow autoplay without any user interaction.
// It MUST be set before the app is ready.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let maintenanceMode = false;

function getPreferredDisplay() {
  // --- DISPLAY SELECTION LOGIC ---
  const displays = screen.getAllDisplays();
  
  const settingsPath = path.join(app.getPath('userData'), 'display-config.json');
  let savedDisplayId = process.env.HTFD_DISPLAY_ID || null;

  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    savedDisplayId = savedDisplayId || saved.displayId;
  } catch (_) {
    // The settings file is optional on first launch.
  }

  const targetDisplay = displays.find(display => String(display.id) === String(savedDisplayId))
    || displays.find(display => display.id !== screen.getPrimaryDisplay().id)
    || screen.getPrimaryDisplay();

  try {
    fs.writeFileSync(settingsPath, JSON.stringify({ displayId: targetDisplay.id }, null, 2));
  } catch (error) {
    log.warn('Could not persist display preference:', error.message);
  }

  log.info(`Using display ${targetDisplay.id}: ${targetDisplay.bounds.x}, ${targetDisplay.bounds.y}`);
  return targetDisplay;
}

function createWindow() {
  const targetDisplay = getPreferredDisplay();

  // Create the browser window.
  const win = new BrowserWindow({
    // Explicitly set position and size based on the chosen display
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    kiosk: true, 
    alwaysOnTop: true,      // Forces the window above everything else
    skipTaskbar: true,      // Hides the app from the Windows taskbar
    icon: path.join(__dirname, './assets/icon.png'),
    webPreferences: {
      mediaPlaybackRequiresUserGesture: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow = win;

  // --- REMOVE MENU BAR ---
  // Hides "File", "Edit", etc.
  win.removeMenu();

  // Load the index.html of your app.
  win.loadFile('index.html');

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });

  // --- HIDE THE CURSOR ---
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS('html, body { cursor: none !important; }');
  });

  // Handle render process crashes
  win.webContents.on('render-process-gone', (event, detailed) => {
    log.error("Render process gone:", detailed);
    if (!win.isDestroyed()) {
      setTimeout(() => win.reload(), 3000);
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
}

// --- AUTO UPDATE LOGIC ---

function setupAutoUpdater() {
  log.info('Initializing Auto Updater...');
  autoUpdater.autoInstallOnAppQuit = true;

  // Events
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded. It will install at the next planned app restart.');
  });

  // Check for updates with a slight delay and ERROR CATCHING
  setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
          log.error("Failed to check for updates (Non-fatal):", err);
      });
  }, 3000);
  
  // Check for updates every 5 minutes
  setInterval(() => {
      autoUpdater.checkForUpdates().catch(err => {
          log.error("Failed to check for updates (Interval):", err);
      });
  }, 5 * 60 * 1000);
}

// --- SINGLE INSTANCE LOCK ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });

  app.whenReady().then(() => {
    // --- AUTO START ON BOOT ---
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });

    createWindow();
    setupAutoUpdater();
    
    // --- ADD KEYBIND TO CLOSE ---
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
      app.quit();
    });

    // Maintenance mode releases the kiosk without ending the dashboard process.
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      maintenanceMode = !maintenanceMode;
      mainWindow.setKiosk(!maintenanceMode);
      mainWindow.setAlwaysOnTop(!maintenanceMode);
      mainWindow.setSkipTaskbar(!maintenanceMode);
      if (!maintenanceMode) mainWindow.focus();
      log.info(`Maintenance mode ${maintenanceMode ? 'enabled' : 'disabled'}`);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
