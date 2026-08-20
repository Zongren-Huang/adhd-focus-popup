import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "voiceProfile.json";
const CLIPS_DIR_NAME = "clips";

export interface VoiceProfile {
  id: string;
  name: string;
  nagClipFileName: string;
}

interface VoiceProfileFile {
  version: 1;
  profile: VoiceProfile | null;
}

export function loadVoiceProfile(userDataDir: string): VoiceProfile | null {
  const filePath = path.join(userDataDir, FILE_NAME);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<VoiceProfileFile>;
    const p = parsed.profile;
    if (p && typeof p.id === "string" && typeof p.name === "string" && typeof p.nagClipFileName === "string") {
      return { id: p.id, name: p.name, nagClipFileName: p.nagClipFileName };
    }
    return null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.error("Failed to load Voice Profile from disk; treating as none saved.", err);
    return null;
  }
}

export function saveVoiceProfile(userDataDir: string, profile: VoiceProfile): void {
  fs.mkdirSync(userDataDir, { recursive: true });
  const payload: VoiceProfileFile = { version: 1, profile };
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(payload, null, 2), "utf-8");
}

export function clipsDir(userDataDir: string): string {
  return path.join(userDataDir, CLIPS_DIR_NAME);
}

export function clipAbsolutePath(userDataDir: string, fileName: string): string {
  return path.join(clipsDir(userDataDir), fileName);
}
