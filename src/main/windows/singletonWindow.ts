import { app, BrowserWindow, type BrowserWindowConstructorOptions } from "electron";
import path from "path";
import { isQuitting } from "../appLifecycle";

export function createSingletonWindowOpener(
  rendererPathSegments: string[],
  windowOptions: BrowserWindowConstructorOptions,
  hideOnClose = false
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

    if (hideOnClose) {
      win.on("close", (event) => {
        if (!isQuitting()) {
          event.preventDefault();
          win?.hide();
        }
      });
    }

    win.on("closed", () => {
      win = null;
    });

    return win;
  };
}
