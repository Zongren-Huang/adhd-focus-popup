import fs from "node:fs";
import path from "node:path";
import type { TaskList } from "../tasks/taskList";

const FILE_NAME = "tasks.json";

interface TaskListFile {
  version: 1;
  tasks: TaskList;
}

export function loadTaskList(userDataDir: string): TaskList {
  const filePath = path.join(userDataDir, FILE_NAME);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<TaskListFile>;
    return Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    console.error("Failed to load Task List from disk; starting with an empty list.", err);
    return [];
  }
}

export function saveTaskList(userDataDir: string, taskList: TaskList): void {
  fs.mkdirSync(userDataDir, { recursive: true });
  const payload: TaskListFile = { version: 1, tasks: taskList };
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(payload, null, 2), "utf-8");
}
