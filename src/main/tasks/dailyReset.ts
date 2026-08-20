import type { TaskList } from "./taskList";

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Deleted tasks never appear here at all — deleteTask already removes them
// from the list permanently, so "excluded from carry-over" falls out for free.
export function carryOverPendingTasks(taskList: TaskList): TaskList {
  return taskList.filter((task) => task.status === "pending");
}

export interface DailyResetResult {
  taskList: TaskList;
  lastActiveDate: string;
  didReset: boolean;
}

// lastActiveDate is the local date the Task List was last touched (saved).
// null means there's no recorded prior activity (fresh install, or a file
// saved before this field existed) — treated as "nothing to roll over".
export function applyDailyReset(
  taskList: TaskList,
  lastActiveDate: string | null,
  today: string
): DailyResetResult {
  if (lastActiveDate === null || lastActiveDate === today) {
    return { taskList, lastActiveDate: today, didReset: false };
  }
  return { taskList: carryOverPendingTasks(taskList), lastActiveDate: today, didReset: true };
}
