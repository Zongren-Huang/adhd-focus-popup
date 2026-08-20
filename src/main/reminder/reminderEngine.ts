import type { Task } from "../tasks/taskList";

export interface ReminderTimings {
  idleThresholdMs: number;
  durationMs: number;
}

export interface ReminderEngineState {
  firstFiredAt: number | null;
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
  autoMute: boolean;
}

const NOT_IDLE_STATE: ReminderEngineState = { firstFiredAt: null };

export function decideReminder(input: ReminderDecisionInput): ReminderDecision {
  const { currentTask, idleMs, now, muted, snooze, timings, state } = input;

  if (!currentTask) {
    return { fire: false, nextState: NOT_IDLE_STATE, autoMute: false };
  }
  if (muted) {
    return { fire: false, nextState: state, autoMute: false };
  }
  if (snooze !== null && snooze.taskId === currentTask.id && now < snooze.expiresAt) {
    return { fire: false, nextState: state, autoMute: false };
  }
  if (idleMs < timings.idleThresholdMs) {
    return { fire: false, nextState: NOT_IDLE_STATE, autoMute: false };
  }

  if (state.firstFiredAt === null) {
    // Idle threshold just crossed: start a new nagging episode.
    return { fire: true, nextState: { firstFiredAt: now }, autoMute: false };
  }

  if (now - state.firstFiredAt >= timings.durationMs) {
    // Nagged for the configured duration with no response: give up and turn off.
    return { fire: false, nextState: NOT_IDLE_STATE, autoMute: true };
  }

  // Still within the nagging duration: keep firing every tick.
  return { fire: true, nextState: state, autoMute: false };
}
