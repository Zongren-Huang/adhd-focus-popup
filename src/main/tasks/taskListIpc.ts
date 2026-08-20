import { BrowserWindow, ipcMain } from "electron";
import { saveTaskList } from "../persistence/taskListStore";
import { openFullViewWindow } from "../windows/fullView";
import { addTask, deleteTask, markTaskDone, reorderTasks, type TaskList } from "./taskList";

export function registerTaskListIpc(initialTaskList: TaskList, userDataDir: string): void {
  let taskList: TaskList = initialTaskList;

  function broadcast(): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("tasks:updated", taskList);
    }
  }

  function mutate(next: TaskList): void {
    taskList = next;
    saveTaskList(userDataDir, taskList);
    broadcast();
  }

  ipcMain.handle("tasks:getAll", () => taskList);
  ipcMain.handle("tasks:add", (_event, description: string) => mutate(addTask(taskList, description)));
  ipcMain.handle("tasks:delete", (_event, id: string) => mutate(deleteTask(taskList, id)));
  ipcMain.handle("tasks:markDone", (_event, id: string) => mutate(markTaskDone(taskList, id)));
  ipcMain.handle("tasks:reorder", (_event, orderedIds: string[]) => mutate(reorderTasks(taskList, orderedIds)));
  ipcMain.handle("fullView:open", () => {
    openFullViewWindow();
  });
}
