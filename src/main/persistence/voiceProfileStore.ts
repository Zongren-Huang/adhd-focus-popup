import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "voiceProfile.json";
const CLIPS_DIR_NAME = "clips";

export interface VoiceProfile {
  id: string;
  name: string;
  nagClipFileName: string;
  doneAckClipFileName: string | null;
  snoozeAckClipFileName: string | null;
}

export interface VoiceProfileState {
  profiles: VoiceProfile[];
  activeProfileId: string | null;
}

interface VoiceProfileFile {
  version: 1;
  profiles: VoiceProfile[];
  activeProfileId: string | null;
}

const EMPTY_STATE: VoiceProfileState = { profiles: [], activeProfileId: null };

function isValidProfile(p: unknown): p is VoiceProfile {
  if (typeof p !== "object" || p === null) {
    return false;
  }
  const c = p as Partial<VoiceProfile>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.nagClipFileName === "string" &&
    (c.doneAckClipFileName === null || typeof c.doneAckClipFileName === "string") &&
    (c.snoozeAckClipFileName === null || typeof c.snoozeAckClipFileName === "string")
  );
}

export function loadVoiceProfileState(userDataDir: string): VoiceProfileState {
  const filePath = path.join(userDataDir, FILE_NAME);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<VoiceProfileFile>;
    if (!Array.isArray(parsed.profiles) || !parsed.profiles.every(isValidProfile)) {
      return EMPTY_STATE;
    }
    const profiles: VoiceProfile[] = parsed.profiles.map((p) => ({
      id: p.id,
      name: p.name,
      nagClipFileName: p.nagClipFileName,
      doneAckClipFileName: p.doneAckClipFileName,
      snoozeAckClipFileName: p.snoozeAckClipFileName,
    }));
    const activeProfileId =
      typeof parsed.activeProfileId === "string" && profiles.some((p) => p.id === parsed.activeProfileId)
        ? parsed.activeProfileId
        : null;
    return { profiles, activeProfileId };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return EMPTY_STATE;
    }
    console.error("Failed to load Voice Profiles from disk; starting with none saved.", err);
    return EMPTY_STATE;
  }
}

export function saveVoiceProfileState(userDataDir: string, state: VoiceProfileState): void {
  fs.mkdirSync(userDataDir, { recursive: true });
  const payload: VoiceProfileFile = { version: 1, profiles: state.profiles, activeProfileId: state.activeProfileId };
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(payload, null, 2), "utf-8");
}

export function clipsDir(userDataDir: string): string {
  return path.join(userDataDir, CLIPS_DIR_NAME);
}

export function clipAbsolutePath(userDataDir: string, fileName: string): string {
  return path.join(clipsDir(userDataDir), fileName);
}
