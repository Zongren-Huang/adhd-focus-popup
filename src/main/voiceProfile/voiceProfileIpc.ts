import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { BrowserWindow, ipcMain } from "electron";
import {
  clipAbsolutePath,
  clipsDir,
  loadVoiceProfile,
  saveVoiceProfile,
  type VoiceProfile,
} from "../persistence/voiceProfileStore";

export interface VoiceProfileView {
  id: string;
  name: string;
  nagClipUrl: string;
}

export interface SaveVoiceProfilePayload {
  name: string;
  clipData: ArrayBuffer;
  clipExtension: string;
}

function sanitizeExtension(ext: unknown): string {
  return typeof ext === "string" && /^[a-zA-Z0-9]{1,10}$/.test(ext) ? ext : "bin";
}

function toView(userDataDir: string, profile: VoiceProfile): VoiceProfileView {
  return {
    id: profile.id,
    name: profile.name,
    nagClipUrl: pathToFileURL(clipAbsolutePath(userDataDir, profile.nagClipFileName)).href,
  };
}

export function registerVoiceProfileIpc(userDataDir: string): { getActiveNagClipUrl: () => string | null } {
  let profile: VoiceProfile | null = loadVoiceProfile(userDataDir);

  function broadcast(): void {
    const payload = profile ? toView(userDataDir, profile) : null;
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("voiceProfile:updated", payload);
    }
  }

  ipcMain.handle("voiceProfile:get", () => (profile ? toView(userDataDir, profile) : null));

  ipcMain.handle("voiceProfile:save", (_event, payload: SaveVoiceProfilePayload) => {
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    if (!name || !(payload?.clipData instanceof ArrayBuffer) || payload.clipData.byteLength === 0) {
      throw new Error("A name and a Nag Clip are required.");
    }

    const id = randomUUID();
    const fileName = `nag-${id}.${sanitizeExtension(payload.clipExtension)}`;
    fs.mkdirSync(clipsDir(userDataDir), { recursive: true });
    fs.writeFileSync(clipAbsolutePath(userDataDir, fileName), Buffer.from(payload.clipData));

    const previous = profile;
    profile = { id, name, nagClipFileName: fileName };
    saveVoiceProfile(userDataDir, profile);

    if (previous) {
      try {
        fs.unlinkSync(clipAbsolutePath(userDataDir, previous.nagClipFileName));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Failed to remove previous Nag Clip file.", err);
        }
      }
    }

    broadcast();
    return toView(userDataDir, profile);
  });

  return {
    getActiveNagClipUrl: () => (profile ? toView(userDataDir, profile).nagClipUrl : null),
  };
}
