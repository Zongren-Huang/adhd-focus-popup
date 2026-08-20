import { contextBridge } from "electron";
import { PLACEHOLDER_TASK_TEXT } from "../constants";

contextBridge.exposeInMainWorld("stickyNote", {
  taskText: PLACEHOLDER_TASK_TEXT,
});
