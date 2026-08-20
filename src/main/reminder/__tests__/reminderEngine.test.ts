import { describe, expect, it } from "vitest";
import type { Task } from "../../tasks/taskList";
import { decideReminder, type ReminderEngineState, type ReminderTimings, type SnoozeState } from "../reminderEngine";

function task(id: string): Task {
  return { id, description: id, status: "pending" };
}

const timings: ReminderTimings = { idleThresholdMs: 120_000, repeatIntervalMs: 300_000 };
const freshState: ReminderEngineState = { lastFiredAt: null };

describe("decideReminder", () => {
  it("does not fire while idle duration is below the threshold", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 119_999,
      now: 1_000_000,
      muted: false,
      snooze: null,
      timings,
      state: freshState,
    });
    expect(result).toEqual({ fire: false, nextState: { lastFiredAt: null } });
  });

  it("fires the instant idle duration crosses the threshold", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 120_000,
      now: 1_000_000,
      muted: false,
      snooze: null,
      timings,
      state: freshState,
    });
    expect(result).toEqual({ fire: true, nextState: { lastFiredAt: 1_000_000 } });
  });

  it("does not re-fire before the repeat interval elapses, then re-fires once it does", () => {
    const afterFirstFire: ReminderEngineState = { lastFiredAt: 1_000_000 };
    const tooSoon = decideReminder({
      currentTask: task("A"),
      idleMs: 200_000,
      now: 1_000_000 + 299_999,
      muted: false,
      snooze: null,
      timings,
      state: afterFirstFire,
    });
    expect(tooSoon).toEqual({ fire: false, nextState: afterFirstFire });

    const dueAgain = decideReminder({
      currentTask: task("A"),
      idleMs: 200_000,
      now: 1_000_000 + 300_000,
      muted: false,
      snooze: null,
      timings,
      state: afterFirstFire,
    });
    expect(dueAgain).toEqual({ fire: true, nextState: { lastFiredAt: 1_300_000 } });
  });

  it("resets the fire streak once idle duration drops back below threshold", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 0,
      now: 1_000_500,
      muted: false,
      snooze: null,
      timings,
      state: { lastFiredAt: 1_000_000 },
    });
    expect(result).toEqual({ fire: false, nextState: { lastFiredAt: null } });
  });

  it("fires again immediately on the next idle streak after an active gap", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 120_000,
      now: 2_000_000,
      muted: false,
      snooze: null,
      timings,
      state: { lastFiredAt: null },
    });
    expect(result.fire).toBe(true);
  });

  it("suppresses firing while the Current Task is Snoozed, resuming once it expires", () => {
    const snooze: SnoozeState = { taskId: "A", expiresAt: 1_500_000 };
    const whileSnoozed = decideReminder({
      currentTask: task("A"),
      idleMs: 200_000,
      now: 1_400_000,
      muted: false,
      snooze,
      timings,
      state: freshState,
    });
    expect(whileSnoozed).toEqual({ fire: false, nextState: freshState });

    const afterExpiry = decideReminder({
      currentTask: task("A"),
      idleMs: 200_000,
      now: 1_500_000,
      muted: false,
      snooze,
      timings,
      state: freshState,
    });
    expect(afterExpiry.fire).toBe(true);
  });

  it("does not suppress firing when the Snooze belongs to a different task than Current Task", () => {
    const snooze: SnoozeState = { taskId: "old-task", expiresAt: 9_999_999 };
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 200_000,
      now: 1_000_000,
      muted: false,
      snooze,
      timings,
      state: freshState,
    });
    expect(result.fire).toBe(true);
  });

  it("suppresses firing app-wide while Muted, regardless of idle duration", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 999_999,
      now: 1_000_000,
      muted: true,
      snooze: null,
      timings,
      state: freshState,
    });
    expect(result).toEqual({ fire: false, nextState: freshState });
  });

  it("does not crash and does not fire when Muted with no Current Task", () => {
    const result = decideReminder({
      currentTask: undefined,
      idleMs: 999_999,
      now: 1_000_000,
      muted: true,
      snooze: null,
      timings,
      state: freshState,
    });
    expect(result).toEqual({ fire: false, nextState: { lastFiredAt: null } });
  });

  it("never fires for an empty Task List (no Current Task)", () => {
    const result = decideReminder({
      currentTask: undefined,
      idleMs: 999_999,
      now: 1_000_000,
      muted: false,
      snooze: null,
      timings,
      state: freshState,
    });
    expect(result).toEqual({ fire: false, nextState: { lastFiredAt: null } });
  });
});
