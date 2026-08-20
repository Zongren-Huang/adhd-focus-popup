import { BrowserWindow, ipcMain } from "electron";
import { saveTaskListState } from "../persistence/taskListStore";
import { openFullViewWindow } from "../windows/fullView";
import { toLocalDateString } from "./dailyReset";
import { addTask, deleteTask, getCurrentTask, markTaskDone, reorderTasks, type TaskList } from "./taskList";

export interface RegisterTaskListIpcOptions {
  initialTaskList: TaskList;
  userDataDir: string;
  getActiveDoneAckClipUrl: () => string | null;
}

export function registerTaskListIpc(options: RegisterTaskListIpcOptions): { getTaskList: () => TaskList } {
  const { userDataDir, getActiveDoneAckClipUrl } = options;
  let taskList: TaskList = options.initialTaskList;

  function broadcast(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("tasks:updated", taskList);
    }
  }

  function broadcastPlayClip(clipUrl: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("clip:play", clipUrl);
    }
  }

  function mutate(next: TaskList): void {
    taskList = next;
    saveTaskListState(userDataDir, { tasks: taskList, lastActiveDate: toLocalDateString(new Date()) });
    broadcast();
  }

  ipcMain.handle("tasks:getAll", () => taskList);
  ipcMain.handle("tasks:add", (_event, description: string) => mutate(addTask(taskList, description)));
  ipcMain.handle("tasks:delete", (_event, id: string) => mutate(deleteTask(taskList, id)));
  ipcMain.handle("tasks:markDone", (_event, id: string) => {
    const wasCurrentTask = getCurrentTask(taskList)?.id === id;
    mutate(markTaskDone(taskList, id));
    if (wasCurrentTask) {
      const clipUrl = getActiveDoneAckClipUrl();
      if (clipUrl) {
        broadcastPlayClip(clipUrl);
      }
    }
  });
  ipcMain.handle("tasks:reorder", (_event, orderedIds: string[]) => mutate(reorderTasks(taskList, orderedIds)));
  ipcMain.handle("fullView:open", () => {
    openFullViewWindow();
  });

  return { getTaskList: () => taskList };
}
