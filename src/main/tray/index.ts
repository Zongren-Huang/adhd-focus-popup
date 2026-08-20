import { app, Menu, Tray, nativeImage } from "electron";
import path from "path";
import { openFullViewWindow } from "../windows/fullView";
import { createStickyNoteWindow } from "../windows/stickyNote";

// Kept alive at module scope: Electron destroys the tray icon if this is garbage collected.
let tray: Tray | null = null;

export function createTray(): Tray {
  const icon = nativeImage.createFromPath(
    path.join(app.getAppPath(), "assets", "tray-icon.png")
  );

  tray = new Tray(icon);
  tray.setToolTip("ADHD Focus Popup");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Settings",
        click: () => openFullViewWindow(),
      },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ])
  );
  tray.on("click", () => createStickyNoteWindow());

  return tray;
}
