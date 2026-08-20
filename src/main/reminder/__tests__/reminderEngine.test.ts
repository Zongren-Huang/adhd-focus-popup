import { describe, expect, it } from "vitest";
import type { Task } from "../../tasks/taskList";
import { decideReminder, type ReminderEngineState, type ReminderTimings, type SnoozeState } from "../reminderEngine";

function task(id: string): Task {
  return { id, description: id, status: "pending" };
}

const timings: ReminderTimings = { idleThresholdMs: 120_000, durationMs: 300_000 };
const freshState: ReminderEngineState = { firstFiredAt: null };

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
    expect(result).toEqual({ fire: false, nextState: { firstFiredAt: null }, autoMute: false });
  });

  it("fires the instant idle duration crosses the threshold, starting a nagging episode", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 120_000,
      now: 1_000_000,
      muted: false,
      snooze: null,
      timings,
      state: freshState,
    });
    expect(result).toEqual({ fire: true, nextState: { firstFiredAt: 1_000_000 }, autoMute: false });
  });

  it("keeps firing on every subsequent tick while still within the reminder duration", () => {
    const midEpisode: ReminderEngineState = { firstFiredAt: 1_000_000 };
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 200_000,
      now: 1_000_000 + 200_000, // well within the 300_000ms duration
      muted: false,
      snooze: null,
      timings,
      state: midEpisode,
    });
    expect(result).toEqual({ fire: true, nextState: midEpisode, autoMute: false });
  });

  it("stops firing and signals auto-mute once the reminder duration elapses with no response", () => {
    const midEpisode: ReminderEngineState = { firstFiredAt: 1_000_000 };
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 400_000,
      now: 1_000_000 + 300_000, // exactly at the duration boundary
      muted: false,
      snooze: null,
      timings,
      state: midEpisode,
    });
    expect(result).toEqual({ fire: false, nextState: { firstFiredAt: null }, autoMute: true });
  });

  it("resets the episode once idle duration drops back below threshold", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 0,
      now: 1_000_500,
      muted: false,
      snooze: null,
      timings,
      state: { firstFiredAt: 1_000_000 },
    });
    expect(result).toEqual({ fire: false, nextState: { firstFiredAt: null }, autoMute: false });
  });

  it("starts a fresh episode on the next idle streak after an active gap", () => {
    const result = decideReminder({
      currentTask: task("A"),
      idleMs: 120_000,
      now: 2_000_000,
      muted: false,
      snooze: null,
      timings,
      state: { firstFiredAt: null },
    });
    expect(result).toEqual({ fire: true, nextState: { firstFiredAt: 2_000_000 }, autoMute: false });
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
    expect(whileSnoozed).toEqual({ fire: false, nextState: freshState, autoMute: false });

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
    expect(result).toEqual({ fire: false, nextState: freshState, autoMute: false });
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
    expect(result).toEqual({ fire: false, nextState: { firstFiredAt: null }, autoMute: false });
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
    expect(result).toEqual({ fire: false, nextState: { firstFiredAt: null }, autoMute: false });
  });
});
