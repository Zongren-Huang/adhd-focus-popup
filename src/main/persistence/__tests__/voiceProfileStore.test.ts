import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadVoiceProfile, saveVoiceProfile } from "../voiceProfileStore";

describe("voiceProfileStore", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("returns null when no file exists yet", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    expect(loadVoiceProfile(dir)).toBeNull();
  });

  it("round-trips a saved profile", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    const profile = { id: "1", name: "Coach", nagClipFileName: "nag-1.webm" };
    saveVoiceProfile(dir, profile);
    expect(loadVoiceProfile(dir)).toEqual(profile);
  });

  it("creates the userData directory if it doesn't exist", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    dir = path.join(base, "nested");
    saveVoiceProfile(dir, { id: "1", name: "Coach", nagClipFileName: "nag-1.webm" });
    expect(fs.existsSync(path.join(dir, "voiceProfile.json"))).toBe(true);
  });

  it("returns null on corrupt JSON instead of throwing", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    fs.writeFileSync(path.join(dir, "voiceProfile.json"), "{not json", "utf-8");
    expect(loadVoiceProfile(dir)).toBeNull();
  });

  it("returns null when the stored record is missing a required field", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    fs.writeFileSync(
      path.join(dir, "voiceProfile.json"),
      JSON.stringify({ version: 1, profile: { id: "1", name: "Coach" } }),
      "utf-8"
    );
    expect(loadVoiceProfile(dir)).toBeNull();
  });
});
