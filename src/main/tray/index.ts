import { Menu, Tray, nativeImage } from "electron";
import path from "path";
import { app } from "electron";
import { openFullViewWindow } from "../windows/fullView";

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
        label: "Open Full View",
        click: () => openFullViewWindow(),
      },
    ])
  );

  return tray;
}

export function getTray(): Tray | null {
  return tray;
}
