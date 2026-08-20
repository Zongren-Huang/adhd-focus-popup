import type { Task } from "../tasks/taskList";

export interface ReminderTimings {
  idleThresholdMs: number;
  repeatIntervalMs: number;
}

export interface ReminderEngineState {
  lastFiredAt: number | null;
}

export interface SnoozeState {
  readonly taskId: string;
  readonly expiresAt: number;
}

export interface ReminderDecisionInput {
  currentTask: Task | undefined;
  idleMs: number;
  now: number;
  muted: boolean;
  snooze: SnoozeState | null;
  timings: ReminderTimings;
  state: ReminderEngineState;
}

export interface ReminderDecision {
  fire: boolean;
  nextState: ReminderEngineState;
}

const NOT_IDLE_STATE: ReminderEngineState = { lastFiredAt: null };

export function decideReminder(input: ReminderDecisionInput): ReminderDecision {
  const { currentTask, idleMs, now, muted, snooze, timings, state } = input;

  if (!currentTask) {
    return { fire: false, nextState: NOT_IDLE_STATE };
  }
  if (muted) {
    return { fire: false, nextState: state };
  }
  if (snooze !== null && snooze.taskId === currentTask.id && now < snooze.expiresAt) {
    return { fire: false, nextState: state };
  }
  if (idleMs < timings.idleThresholdMs) {
    return { fire: false, nextState: NOT_IDLE_STATE };
  }
  if (state.lastFiredAt === null || now - state.lastFiredAt >= timings.repeatIntervalMs) {
    return { fire: true, nextState: { lastFiredAt: now } };
  }
  return { fire: false, nextState: state };
}
