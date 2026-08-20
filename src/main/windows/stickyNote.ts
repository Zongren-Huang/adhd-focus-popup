import path from "path";
import { createSingletonWindowOpener } from "./singletonWindow";

export const createStickyNoteWindow = createSingletonWindowOpener(
  ["src", "renderer", "sticky-note", "index.html"],
  {
    width: 280,
    height: 220,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "preload", "stickyNote.js"),
    },
  },
  true
);
