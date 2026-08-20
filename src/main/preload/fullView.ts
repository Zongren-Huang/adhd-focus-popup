import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("fullView", {
  getAllTasks: () => ipcRenderer.invoke("tasks:getAll"),
  addTask: (description: string) => ipcRenderer.invoke("tasks:add", description),
  deleteTask: (id: string) => ipcRenderer.invoke("tasks:delete", id),
  markDone: (id: string) => ipcRenderer.invoke("tasks:markDone", id),
  reorderTasks: (orderedIds: string[]) => ipcRenderer.invoke("tasks:reorder", orderedIds),
  onTasksUpdated: (callback: (tasks: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, tasks: unknown[]) => callback(tasks);
    ipcRenderer.on("tasks:updated", listener);
    return () => ipcRenderer.removeListener("tasks:updated", listener);
  },
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: unknown) => ipcRenderer.invoke("settings:update", settings),
});
