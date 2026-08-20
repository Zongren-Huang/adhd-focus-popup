import { app, BrowserWindow } from "electron";
import path from "path";

let stickyNoteWindow: BrowserWindow | null = null;

export function createStickyNoteWindow(): BrowserWindow {
  if (stickyNoteWindow && !stickyNoteWindow.isDestroyed()) {
    stickyNoteWindow.show();
    return stickyNoteWindow;
  }

  stickyNoteWindow = new BrowserWindow({
    width: 280,
    height: 160,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  stickyNoteWindow.loadFile(
    path.join(app.getAppPath(), "src", "renderer", "sticky-note", "index.html")
  );

  stickyNoteWindow.on("closed", () => {
    stickyNoteWindow = null;
  });

  return stickyNoteWindow;
}

export function getStickyNoteWindow(): BrowserWindow | null {
  return stickyNoteWindow;
}
