import path from "path";
import { createSingletonWindowOpener } from "./singletonWindow";

export const openFullViewWindow = createSingletonWindowOpener(
  ["src", "renderer", "full-view", "index.html"],
  {
    width: 720,
    height: 560,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "..", "preload", "fullView.js"),
    },
  }
);
