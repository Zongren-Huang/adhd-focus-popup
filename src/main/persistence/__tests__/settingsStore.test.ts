import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_REMINDER_SETTINGS, loadReminderSettings, saveReminderSettings } from "../settingsStore";

describe("settingsStore", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("returns default settings when no file exists yet", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "settingsstore-"));
    expect(loadReminderSettings(dir)).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it("round-trips saved settings", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "settingsstore-"));
    const settings = { idleThresholdMinutes: 3, repeatIntervalMinutes: 7, defaultSnoozeMinutes: 15 };
    saveReminderSettings(dir, settings);
    expect(loadReminderSettings(dir)).toEqual(settings);
  });

  it("creates the userData directory if it doesn't exist", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "settingsstore-"));
    dir = path.join(base, "nested");
    saveReminderSettings(dir, DEFAULT_REMINDER_SETTINGS);
    expect(fs.existsSync(path.join(dir, "settings.json"))).toBe(true);
  });

  it("falls back to defaults on corrupt JSON instead of throwing", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "settingsstore-"));
    fs.writeFileSync(path.join(dir, "settings.json"), "{not json", "utf-8");
    expect(loadReminderSettings(dir)).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it("falls back to the default per-field when a field is missing or invalid", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "settingsstore-"));
    fs.writeFileSync(
      path.join(dir, "settings.json"),
      JSON.stringify({ version: 1, idleThresholdMinutes: -5, repeatIntervalMinutes: 8 }),
      "utf-8"
    );
    expect(loadReminderSettings(dir)).toEqual({
      idleThresholdMinutes: DEFAULT_REMINDER_SETTINGS.idleThresholdMinutes,
      repeatIntervalMinutes: 8,
      defaultSnoozeMinutes: DEFAULT_REMINDER_SETTINGS.defaultSnoozeMinutes,
    });
  });
});
