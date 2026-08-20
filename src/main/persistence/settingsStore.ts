import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "settings.json";

export interface ReminderSettings {
  idleThresholdMinutes: number;
  reminderDurationMinutes: number;
  defaultSnoozeMinutes: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  idleThresholdMinutes: 2,
  reminderDurationMinutes: 5,
  defaultSnoozeMinutes: 10,
};

interface SettingsFile extends ReminderSettings {
  version: 1;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function loadReminderSettings(userDataDir: string): ReminderSettings {
  const filePath = path.join(userDataDir, FILE_NAME);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<SettingsFile>;
    return {
      idleThresholdMinutes: isPositiveNumber(parsed.idleThresholdMinutes)
        ? parsed.idleThresholdMinutes
        : DEFAULT_REMINDER_SETTINGS.idleThresholdMinutes,
      reminderDurationMinutes: isPositiveNumber(parsed.reminderDurationMinutes)
        ? parsed.reminderDurationMinutes
        : DEFAULT_REMINDER_SETTINGS.reminderDurationMinutes,
      defaultSnoozeMinutes: isPositiveNumber(parsed.defaultSnoozeMinutes)
        ? parsed.defaultSnoozeMinutes
        : DEFAULT_REMINDER_SETTINGS.defaultSnoozeMinutes,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_REMINDER_SETTINGS };
    }
    console.error("Failed to load Reminder settings from disk; using defaults.", err);
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
}

export function saveReminderSettings(userDataDir: string, settings: ReminderSettings): void {
  fs.mkdirSync(userDataDir, { recursive: true });
  const payload: SettingsFile = { version: 1, ...settings };
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(payload, null, 2), "utf-8");
}
