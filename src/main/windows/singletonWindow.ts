import { app, BrowserWindow, type BrowserWindowConstructorOptions } from "electron";
import path from "path";

export function createSingletonWindowOpener(
  rendererPathSegments: string[],
  windowOptions: BrowserWindowConstructorOptions
): () => BrowserWindow {
  let win: BrowserWindow | null = null;

  return function open(): BrowserWindow {
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
      return win;
    }

    win = new BrowserWindow(windowOptions);
    win.loadFile(path.join(app.getAppPath(), ...rendererPathSegments));
    win.on("closed", () => {
      win = null;
    });

    return win;
  };
}
