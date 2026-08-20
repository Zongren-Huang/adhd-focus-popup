import { app, BrowserWindow } from "electron";
import path from "path";

let fullViewWindow: BrowserWindow | null = null;

export function openFullViewWindow(): BrowserWindow {
  if (fullViewWindow && !fullViewWindow.isDestroyed()) {
    fullViewWindow.show();
    fullViewWindow.focus();
    return fullViewWindow;
  }

  fullViewWindow = new BrowserWindow({
    width: 720,
    height: 560,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  fullViewWindow.loadFile(
    path.join(app.getAppPath(), "src", "renderer", "full-view", "index.html")
  );

  fullViewWindow.on("closed", () => {
    fullViewWindow = null;
  });

  return fullViewWindow;
}

export function getFullViewWindow(): BrowserWindow | null {
  return fullViewWindow;
}
