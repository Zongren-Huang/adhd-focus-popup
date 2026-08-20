import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { BrowserWindow, ipcMain } from "electron";
import {
  clipAbsolutePath,
  clipsDir,
  loadVoiceProfileState,
  saveVoiceProfileState,
  type VoiceProfile,
  type VoiceProfileState,
} from "../persistence/voiceProfileStore";

export interface VoiceProfileView {
  id: string;
  name: string;
  nagClipUrl: string;
  doneAckClipUrl: string | null;
  snoozeAckClipUrl: string | null;
}

export interface VoiceProfileStateView {
  profiles: VoiceProfileView[];
  activeProfileId: string | null;
}

export interface CreateVoiceProfilePayload {
  name: string;
  clipData: ArrayBuffer;
  clipExtension: string;
}

export interface SetAckClipPayload {
  profileId: string;
  clipData: ArrayBuffer;
  clipExtension: string;
}

export interface VoiceProfileIpcApi {
  getActiveNagClipUrl: () => string | null;
  getActiveDoneAckClipUrl: () => string | null;
  getActiveSnoozeAckClipUrl: () => string | null;
}

function sanitizeExtension(ext: unknown): string {
  return typeof ext === "string" && /^[a-zA-Z0-9]{1,10}$/.test(ext) ? ext : "bin";
}

function clipUrl(userDataDir: string, fileName: string | null | undefined): string | null {
  return fileName ? pathToFileURL(clipAbsolutePath(userDataDir, fileName)).href : null;
}

function toView(userDataDir: string, profile: VoiceProfile): VoiceProfileView {
  return {
    id: profile.id,
    name: profile.name,
    nagClipUrl: pathToFileURL(clipAbsolutePath(userDataDir, profile.nagClipFileName)).href,
    doneAckClipUrl: clipUrl(userDataDir, profile.doneAckClipFileName),
    snoozeAckClipUrl: clipUrl(userDataDir, profile.snoozeAckClipFileName),
  };
}

function toStateView(userDataDir: string, state: VoiceProfileState): VoiceProfileStateView {
  return { profiles: state.profiles.map((p) => toView(userDataDir, p)), activeProfileId: state.activeProfileId };
}

function writeClipFile(userDataDir: string, fileName: string, clipData: ArrayBuffer): void {
  fs.mkdirSync(clipsDir(userDataDir), { recursive: true });
  fs.writeFileSync(clipAbsolutePath(userDataDir, fileName), Buffer.from(clipData));
}

function deletePreviousClip(userDataDir: string, previousFileName: string | null, newFileName: string): void {
  if (!previousFileName || previousFileName === newFileName) {
    return;
  }
  try {
    fs.unlinkSync(clipAbsolutePath(userDataDir, previousFileName));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to remove previous clip file.", err);
    }
  }
}

export function registerVoiceProfileIpc(userDataDir: string): VoiceProfileIpcApi {
  let state: VoiceProfileState = loadVoiceProfileState(userDataDir);

  function persistAndBroadcast(): VoiceProfileStateView {
    saveVoiceProfileState(userDataDir, state);
    const payload = toStateView(userDataDir, state);
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("voiceProfile:updated", payload);
    }
    return payload;
  }

  function findProfile(profileId: unknown): VoiceProfile {
    const profile = state.profiles.find((p) => p.id === profileId);
    if (!profile) {
      throw new Error("Unknown Voice Profile.");
    }
    return profile;
  }

  function setAckClip(
    filePrefix: string,
    getExisting: (p: VoiceProfile) => string | null,
    withNewFileName: (p: VoiceProfile, fileName: string) => VoiceProfile,
    payload: SetAckClipPayload
  ): VoiceProfileStateView {
    const profile = findProfile(payload?.profileId);
    if (!(payload?.clipData instanceof ArrayBuffer) || payload.clipData.byteLength === 0) {
      throw new Error("An Acknowledgment Clip is required.");
    }
    const fileName = `${filePrefix}-${profile.id}.${sanitizeExtension(payload.clipExtension)}`;
    writeClipFile(userDataDir, fileName, payload.clipData);
    const previousFileName = getExisting(profile);
    const updated = withNewFileName(profile, fileName);
    state = { ...state, profiles: state.profiles.map((p) => (p.id === profile.id ? updated : p)) };
    deletePreviousClip(userDataDir, previousFileName, fileName);
    return persistAndBroadcast();
  }

  ipcMain.handle("voiceProfile:getState", () => toStateView(userDataDir, state));

  ipcMain.handle("voiceProfile:create", (_event, payload: CreateVoiceProfilePayload) => {
    const name = typeof payload?.name === "string" ? payload.name.trim() : "";
    if (!name || !(payload?.clipData instanceof ArrayBuffer) || payload.clipData.byteLength === 0) {
      throw new Error("A name and a Nag Clip are required.");
    }
    const id = randomUUID();
    const fileName = `nag-${id}.${sanitizeExtension(payload.clipExtension)}`;
    writeClipFile(userDataDir, fileName, payload.clipData);
    const profile: VoiceProfile = {
      id,
      name,
      nagClipFileName: fileName,
      doneAckClipFileName: null,
      snoozeAckClipFileName: null,
    };
    state = {
      profiles: [...state.profiles, profile],
      activeProfileId: state.activeProfileId === null ? id : state.activeProfileId,
    };
    return persistAndBroadcast();
  });

  ipcMain.handle("voiceProfile:setActive", (_event, profileId: string) => {
    const profile = findProfile(profileId);
    state = { ...state, activeProfileId: profile.id };
    return persistAndBroadcast();
  });

  ipcMain.handle("voiceProfile:delete", (_event, profileId: string) => {
    const profile = findProfile(profileId);
    const remainingProfiles = state.profiles.filter((p) => p.id !== profileId);
    const activeProfileId =
      state.activeProfileId === profileId ? (remainingProfiles[0]?.id ?? null) : state.activeProfileId;
    state = { profiles: remainingProfiles, activeProfileId };

    for (const fileName of [profile.nagClipFileName, profile.doneAckClipFileName, profile.snoozeAckClipFileName]) {
      if (!fileName) {
        continue;
      }
      try {
        fs.unlinkSync(clipAbsolutePath(userDataDir, fileName));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Failed to remove clip file for deleted Voice Profile.", err);
        }
      }
    }

    return persistAndBroadcast();
  });

  ipcMain.handle("voiceProfile:setDoneAckClip", (_event, payload: SetAckClipPayload) =>
    setAckClip(
      "done-ack",
      (p) => p.doneAckClipFileName,
      (p, fileName) => ({ ...p, doneAckClipFileName: fileName }),
      payload
    )
  );

  ipcMain.handle("voiceProfile:setSnoozeAckClip", (_event, payload: SetAckClipPayload) =>
    setAckClip(
      "snooze-ack",
      (p) => p.snoozeAckClipFileName,
      (p, fileName) => ({ ...p, snoozeAckClipFileName: fileName }),
      payload
    )
  );

  function getActiveProfile(): VoiceProfile | undefined {
    return state.profiles.find((p) => p.id === state.activeProfileId);
  }

  return {
    getActiveNagClipUrl: () => clipUrl(userDataDir, getActiveProfile()?.nagClipFileName),
    getActiveDoneAckClipUrl: () => clipUrl(userDataDir, getActiveProfile()?.doneAckClipFileName),
    getActiveSnoozeAckClipUrl: () => clipUrl(userDataDir, getActiveProfile()?.snoozeAckClipFileName),
  };
}
