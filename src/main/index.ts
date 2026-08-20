import { app } from "electron";
import { loadTaskList } from "./persistence/taskListStore";
import { registerTaskListIpc } from "./tasks/taskListIpc";
import { createTray } from "./tray";
import { createStickyNoteWindow } from "./windows/stickyNote";

app.whenReady().then(() => {
  const userDataDir = app.getPath("userData");
  const taskList = loadTaskList(userDataDir);
  registerTaskListIpc(taskList, userDataDir);

  createStickyNoteWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // The tray icon keeps the app alive even with no windows open.
  // Ticket #7 (tray lifecycle) owns explicit quit behavior.
});
