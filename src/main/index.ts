import { app } from "electron";
import { loadTaskListState, saveTaskListState } from "./persistence/taskListStore";
import { applyDailyReset, toLocalDateString } from "./tasks/dailyReset";
import { registerTaskListIpc } from "./tasks/taskListIpc";
import { createTray } from "./tray";
import { createStickyNoteWindow } from "./windows/stickyNote";

app.whenReady().then(() => {
  const userDataDir = app.getPath("userData");
  const { tasks, lastActiveDate } = loadTaskListState(userDataDir);
  const today = toLocalDateString(new Date());
  const reset = applyDailyReset(tasks, lastActiveDate, today);
  if (reset.didReset) {
    saveTaskListState(userDataDir, { tasks: reset.taskList, lastActiveDate: reset.lastActiveDate });
  }
  registerTaskListIpc(reset.taskList, userDataDir);

  createStickyNoteWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // The tray icon keeps the app alive even with no windows open.
  // Ticket #7 (tray lifecycle) owns explicit quit behavior.
});
