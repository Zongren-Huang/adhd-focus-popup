import { randomUUID } from "node:crypto";

export type TaskStatus = "pending" | "done";

export interface Task {
  readonly id: string;
  readonly description: string;
  readonly status: TaskStatus;
}

export type TaskList = readonly Task[];

export function addTask(
  taskList: TaskList,
  description: string,
  createId: () => string = randomUUID
): TaskList {
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    throw new Error("Task description must not be empty.");
  }
  return [...taskList, { id: createId(), description: trimmed, status: "pending" }];
}

export function deleteTask(taskList: TaskList, id: string): TaskList {
  return taskList.filter((task) => task.id !== id);
}

export function markTaskDone(taskList: TaskList, id: string): TaskList {
  return taskList.map((task) => (task.id === id ? { ...task, status: "done" as const } : task));
}

// orderedIds must be a permutation of the current list's ids — this is what a
// native HTML5 drag-and-drop renderer naturally produces (final DOM order of ids).
export function reorderTasks(taskList: TaskList, orderedIds: readonly string[]): TaskList {
  const currentIds = taskList.map((task) => task.id);
  const isPermutation =
    orderedIds.length === currentIds.length &&
    new Set(orderedIds).size === orderedIds.length &&
    currentIds.every((id) => orderedIds.includes(id));
  if (!isPermutation) {
    throw new Error("orderedIds must be a permutation of the current Task List's ids.");
  }
  const byId = new Map(taskList.map((task) => [task.id, task] as const));
  return orderedIds.map((id) => byId.get(id)!);
}

export function getCurrentTask(taskList: TaskList): Task | undefined {
  return taskList.find((task) => task.status === "pending");
}
