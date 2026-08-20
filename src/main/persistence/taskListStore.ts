import fs from "node:fs";
import path from "node:path";
import type { TaskList } from "../tasks/taskList";

const FILE_NAME = "tasks.json";

export interface TaskListState {
  tasks: TaskList;
  lastActiveDate: string | null;
}

interface TaskListFile {
  version: 1;
  tasks: TaskList;
  lastActiveDate: string | null;
}

export function loadTaskListState(userDataDir: string): TaskListState {
  const filePath = path.join(userDataDir, FILE_NAME);
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<TaskListFile>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      lastActiveDate: typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : null,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { tasks: [], lastActiveDate: null };
    }
    console.error("Failed to load Task List from disk; starting with an empty list.", err);
    return { tasks: [], lastActiveDate: null };
  }
}

export function saveTaskListState(userDataDir: string, state: TaskListState): void {
  fs.mkdirSync(userDataDir, { recursive: true });
  const payload: TaskListFile = { version: 1, tasks: state.tasks, lastActiveDate: state.lastActiveDate };
  fs.writeFileSync(path.join(userDataDir, FILE_NAME), JSON.stringify(payload, null, 2), "utf-8");
}
