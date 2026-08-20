import { BrowserWindow, ipcMain, powerMonitor } from "electron";
import { saveReminderSettings, type ReminderSettings } from "../persistence/settingsStore";
import { getCurrentTask, type TaskList } from "../tasks/taskList";
import { decideReminder, type ReminderEngineState, type SnoozeState } from "./reminderEngine";

const IDLE_POLL_INTERVAL_MS = 5_000;
const MINUTE_MS = 60_000;

export interface ReminderPublicState {
  muted: boolean;
  snoozedTaskId: string | null;
}

export interface RegisterReminderIpcOptions {
  userDataDir: string;
  getTaskList: () => TaskList;
  initialSettings: ReminderSettings;
  getActiveNagClipUrl: () => string | null;
  getActiveSnoozeAckClipUrl: () => string | null;
}

function sanitizeMinutes(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function registerReminderIpc(options: RegisterReminderIpcOptions): void {
  const { userDataDir, getTaskList, getActiveNagClipUrl, getActiveSnoozeAckClipUrl } = options;
  let settings: ReminderSettings = options.initialSettings;
  let muted = false;
  let snooze: SnoozeState | null = null;
  let engineState: ReminderEngineState = { firstFiredAt: null };

  function computePublicState(now: number): ReminderPublicState {
    const currentTask = getCurrentTask(getTaskList());
    const snoozedTaskId =
      snooze !== null && currentTask !== undefined && snooze.taskId === currentTask.id && now < snooze.expiresAt
        ? snooze.taskId
        : null;
    return { muted, snoozedTaskId };
  }

  let lastBroadcastState: ReminderPublicState = { muted: false, snoozedTaskId: null };

  function broadcastFire(): void {
    const nagClipUrl = getActiveNagClipUrl();
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("reminder:fired", nagClipUrl);
    }
  }

  function broadcastPlayClip(clipUrl: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("clip:play", clipUrl);
    }
  }

  function maybeBroadcastState(now: number): void {
    const next = computePublicState(now);
    if (next.muted !== lastBroadcastState.muted || next.snoozedTaskId !== lastBroadcastState.snoozedTaskId) {
      lastBroadcastState = next;
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("reminder:stateUpdated", next);
      }
    }
  }

  function tick(): void {
    const now = Date.now();
    const idleMs = powerMonitor.getSystemIdleTime() * 1000;
    const decision = decideReminder({
      currentTask: getCurrentTask(getTaskList()),
      idleMs,
      now,
      muted,
      snooze,
      timings: {
        idleThresholdMs: settings.idleThresholdMinutes * MINUTE_MS,
        durationMs: settings.reminderDurationMinutes * MINUTE_MS,
      },
      state: engineState,
    });
    engineState = decision.nextState;
    if (decision.fire) {
      broadcastFire();
    }
    if (decision.autoMute) {
      muted = true;
    }
    maybeBroadcastState(now);
  }

  ipcMain.handle("reminder:snooze", () => {
    const currentTask = getCurrentTask(getTaskList());
    if (currentTask) {
      snooze = { taskId: currentTask.id, expiresAt: Date.now() + settings.defaultSnoozeMinutes * MINUTE_MS };
      const clipUrl = getActiveSnoozeAckClipUrl();
      if (clipUrl) {
        broadcastPlayClip(clipUrl);
      }
    }
    lastBroadcastState = computePublicState(Date.now());
    return lastBroadcastState;
  });

  ipcMain.handle("reminder:setMuted", (_event, value: boolean) => {
    muted = Boolean(value);
    lastBroadcastState = computePublicState(Date.now());
    return lastBroadcastState;
  });

  ipcMain.handle("reminder:getState", () => computePublicState(Date.now()));

  ipcMain.handle("settings:get", () => settings);
  ipcMain.handle("settings:update", (_event, next: Partial<ReminderSettings>) => {
    settings = {
      idleThresholdMinutes: sanitizeMinutes(next?.idleThresholdMinutes, settings.idleThresholdMinutes),
      reminderDurationMinutes: sanitizeMinutes(next?.reminderDurationMinutes, settings.reminderDurationMinutes),
      defaultSnoozeMinutes: sanitizeMinutes(next?.defaultSnoozeMinutes, settings.defaultSnoozeMinutes),
    };
    saveReminderSettings(userDataDir, settings);
    return settings;
  });

  setInterval(tick, IDLE_POLL_INTERVAL_MS);
}
