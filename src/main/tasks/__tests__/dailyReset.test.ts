import { describe, expect, it } from "vitest";
import { applyDailyReset, carryOverPendingTasks, toLocalDateString } from "../dailyReset";
import type { Task } from "../taskList";

function task(description: string, status: Task["status"]): Task {
  return { id: description, description, status };
}

describe("toLocalDateString", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026, local time
    expect(toLocalDateString(date)).toBe("2026-01-05");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 8, 9); // Sep 9, 2026
    expect(toLocalDateString(date)).toBe("2026-09-09");
  });
});

describe("carryOverPendingTasks", () => {
  it("keeps pending tasks, in their original relative order", () => {
    const list = [task("A", "pending"), task("B", "pending"), task("C", "pending")];
    expect(carryOverPendingTasks(list).map((t) => t.description)).toEqual(["A", "B", "C"]);
  });

  it("drops done tasks while preserving order of the rest", () => {
    const list = [task("A", "done"), task("B", "pending"), task("C", "done"), task("D", "pending")];
    expect(carryOverPendingTasks(list).map((t) => t.description)).toEqual(["B", "D"]);
  });

  it("returns an empty list when every task is done", () => {
    const list = [task("A", "done"), task("B", "done")];
    expect(carryOverPendingTasks(list)).toEqual([]);
  });

  it("returns an empty list unchanged", () => {
    expect(carryOverPendingTasks([])).toEqual([]);
  });
});

describe("applyDailyReset", () => {
  it("makes no change when today matches lastActiveDate", () => {
    const list = [task("A", "done"), task("B", "pending")];
    const result = applyDailyReset(list, "2026-08-19", "2026-08-19");
    expect(result).toEqual({ taskList: list, lastActiveDate: "2026-08-19", didReset: false });
  });

  it("makes no change when lastActiveDate is null (no prior recorded activity)", () => {
    const list = [task("A", "done"), task("B", "pending")];
    const result = applyDailyReset(list, null, "2026-08-19");
    expect(result).toEqual({ taskList: list, lastActiveDate: "2026-08-19", didReset: false });
  });

  it("carries over only pending tasks, in order, when today is a new day", () => {
    const list = [task("A", "done"), task("B", "pending"), task("C", "pending")];
    const result = applyDailyReset(list, "2026-08-18", "2026-08-19");
    expect(result).toEqual({
      taskList: [task("B", "pending"), task("C", "pending")],
      lastActiveDate: "2026-08-19",
      didReset: true,
    });
  });

  it("results in an empty list when every prior task was done and the day rolled over", () => {
    const list = [task("A", "done")];
    const result = applyDailyReset(list, "2026-08-18", "2026-08-19");
    expect(result.taskList).toEqual([]);
    expect(result.didReset).toBe(true);
  });
});
