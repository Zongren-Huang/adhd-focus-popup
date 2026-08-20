import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("stickyNote", {
  getAllTasks: () => ipcRenderer.invoke("tasks:getAll"),
  markDone: (id: string) => ipcRenderer.invoke("tasks:markDone", id),
  openFullView: () => ipcRenderer.invoke("fullView:open"),
  onTasksUpdated: (callback: (tasks: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, tasks: unknown[]) => callback(tasks);
    ipcRenderer.on("tasks:updated", listener);
    return () => ipcRenderer.removeListener("tasks:updated", listener);
  },
  snooze: () => ipcRenderer.invoke("reminder:snooze"),
  setMuted: (value: boolean) => ipcRenderer.invoke("reminder:setMuted", value),
  getReminderState: () => ipcRenderer.invoke("reminder:getState"),
  onReminderFired: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("reminder:fired", listener);
    return () => ipcRenderer.removeListener("reminder:fired", listener);
  },
  onReminderStateUpdated: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on("reminder:stateUpdated", listener);
    return () => ipcRenderer.removeListener("reminder:stateUpdated", listener);
  },
});
