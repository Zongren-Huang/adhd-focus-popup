import { app, session } from "electron";
import { loadReminderSettings } from "./persistence/settingsStore";
import { loadTaskListState, saveTaskListState } from "./persistence/taskListStore";
import { registerReminderIpc } from "./reminder/reminderIpc";
import { applyDailyReset, toLocalDateString } from "./tasks/dailyReset";
import { registerTaskListIpc } from "./tasks/taskListIpc";
import { createTray } from "./tray";
import { registerVoiceProfileIpc } from "./voiceProfile/voiceProfileIpc";
import { createStickyNoteWindow } from "./windows/stickyNote";

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media");
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === "media");

  const userDataDir = app.getPath("userData");
  const { tasks, lastActiveDate } = loadTaskListState(userDataDir);
  const today = toLocalDateString(new Date());
  const reset = applyDailyReset(tasks, lastActiveDate, today);
  if (reset.didReset) {
    saveTaskListState(userDataDir, { tasks: reset.taskList, lastActiveDate: reset.lastActiveDate });
  }
  const voiceProfileApi = registerVoiceProfileIpc(userDataDir);
  const taskListApi = registerTaskListIpc({
    initialTaskList: reset.taskList,
    userDataDir,
    getActiveDoneAckClipUrl: voiceProfileApi.getActiveDoneAckClipUrl,
  });

  registerReminderIpc({
    userDataDir,
    getTaskList: taskListApi.getTaskList,
    initialSettings: loadReminderSettings(userDataDir),
    getActiveNagClipUrl: voiceProfileApi.getActiveNagClipUrl,
    getActiveSnoozeAckClipUrl: voiceProfileApi.getActiveSnoozeAckClipUrl,
  });

  createStickyNoteWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // The tray icon keeps the app alive even with no windows open.
  // Ticket #7 (tray lifecycle) owns explicit quit behavior.
});
