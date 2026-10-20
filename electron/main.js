const { app, BrowserWindow, shell, dialog } = require("electron");
const http = require("http");
const path = require("path");
const fs = require("fs");

const PORT = 3000;
const APP_URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let nextServer = null;

function loadEnvironmentFile() {
  try {
    const dotenv = require("dotenv");

    const possibleEnvPaths = [
      path.join(process.cwd(), ".env"),
      path.join(app.getAppPath(), ".env"),
      path.join(process.resourcesPath || "", "app", ".env"),
      path.join(process.resourcesPath || "", ".env"),
    ];

    const envPath = possibleEnvPaths.find((filePath) =>
      fs.existsSync(filePath)
    );

    if (envPath) {
      dotenv.config({
        path: envPath,
        override: true,
      });

      console.log("ENV loaded from:", envPath);
    } else {
      console.error("File .env tidak ditemukan.");
    }
  } catch (error) {
    console.error("Gagal membaca file .env:", error);
  }
}

async function startNextServerForPackagedApp() {
  if (!app.isPackaged) {
    return;
  }

  loadEnvironmentFile();

  const next = require("next");
  const appPath = app.getAppPath();

  try {
    process.chdir(appPath);
  } catch (error) {
    console.error("Gagal mengubah working directory:", error);
  }

  const nextApp = next({
    dev: false,
    dir: appPath,
  });

  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  nextServer = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve, reject) => {
    nextServer.once("error", reject);

    nextServer.listen(PORT, "127.0.0.1", () => {
      nextServer.off("error", reject);
      console.log(`Leona Store berjalan di ${APP_URL}`);
      resolve();
    });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "Leona Store",
    backgroundColor: "#fff7fb",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.maximize();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) {
      return {
        action: "allow",
      };
    }

    shell.openExternal(url);

    return {
      action: "deny",
    };
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      console.error("Gagal memuat halaman:", errorCode, errorDescription);
    }
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startNextServerForPackagedApp();
    createMainWindow();
  } catch (error) {
    console.error("Gagal menjalankan aplikasi:", error);

    dialog.showErrorBox(
      "Leona Store gagal dijalankan",
      "Aplikasi gagal membuka server internal. Pastikan MySQL/MariaDB sudah menyala dan file .env tersedia."
    );

    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.close();
    nextServer = null;
  }
});