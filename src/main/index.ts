import { app } from "electron";
import { createStickyNoteWindow } from "./windows/stickyNote";
import { createTray } from "./tray";

app.whenReady().then(() => {
  createStickyNoteWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // The tray icon keeps the app alive even with no windows open.
  // Ticket #7 (tray lifecycle) owns explicit quit behavior.
});
