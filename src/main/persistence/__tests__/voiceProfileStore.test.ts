import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadVoiceProfileState, saveVoiceProfileState } from "../voiceProfileStore";

function profile(overrides = {}) {
  return {
    id: "1",
    name: "Coach",
    nagClipFileName: "nag-1.webm",
    doneAckClipFileName: null,
    snoozeAckClipFileName: null,
    ...overrides,
  };
}

describe("voiceProfileStore", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("returns an empty state when no file exists yet", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    expect(loadVoiceProfileState(dir)).toEqual({ profiles: [], activeProfileId: null });
  });

  it("round-trips saved profiles and the active profile id", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    const state = { profiles: [profile()], activeProfileId: "1" };
    saveVoiceProfileState(dir, state);
    expect(loadVoiceProfileState(dir)).toEqual(state);
  });

  it("creates the userData directory if it doesn't exist", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    dir = path.join(base, "nested");
    saveVoiceProfileState(dir, { profiles: [], activeProfileId: null });
    expect(fs.existsSync(path.join(dir, "voiceProfile.json"))).toBe(true);
  });

  it("returns an empty state on corrupt JSON instead of throwing", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    fs.writeFileSync(path.join(dir, "voiceProfile.json"), "{not json", "utf-8");
    expect(loadVoiceProfileState(dir)).toEqual({ profiles: [], activeProfileId: null });
  });

  it("returns an empty state when a profile entry is missing a required field", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    fs.writeFileSync(
      path.join(dir, "voiceProfile.json"),
      JSON.stringify({ version: 1, profiles: [{ id: "1", name: "Coach" }], activeProfileId: null }),
      "utf-8"
    );
    expect(loadVoiceProfileState(dir)).toEqual({ profiles: [], activeProfileId: null });
  });

  it("normalizes a stale activeProfileId that no longer matches any profile to null", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceprofilestore-"));
    fs.writeFileSync(
      path.join(dir, "voiceProfile.json"),
      JSON.stringify({ version: 1, profiles: [profile()], activeProfileId: "unknown-id" }),
      "utf-8"
    );
    expect(loadVoiceProfileState(dir)).toEqual({ profiles: [profile()], activeProfileId: null });
  });
});
