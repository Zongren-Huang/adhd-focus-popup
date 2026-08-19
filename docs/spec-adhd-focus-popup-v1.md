## Problem Statement

People with ADHD often set out to do a task, get distracted mid-task — frequently by picking up their phone — and lose track of what they were supposed to be doing, with no mechanism to catch that drift and pull attention back. Generic to-do apps and OS notifications are easy to ignore or swipe away without engaging; they don't create the urgency or personal connection needed to actually interrupt the scroll.

## Solution

A small, always-visible desktop window (the Sticky Note) keeps the day's single most important task in view at all times. When the user goes idle at the keyboard/mouse — the signal that they've drifted off, most likely to their phone — the app nags them out loud using a voice recording of their choosing, repeating until they respond. The user manages their full task list, priority order, and voice setup from a separate window (Full View), reached from the system tray.

## User Stories

1. As a user, I want to add a task with a short description, so that I can capture what I need to do today.
2. As a user, I want to set the priority order of my tasks, so that the app always nags me about the most important one first.
3. As a user, I want to see only my current top-priority task in a small always-on-top window, so that I don't lose sight of what I should be doing regardless of what else is on my screen.
4. As a user, I want the app to notice when I've stopped touching my keyboard and mouse for a couple of minutes, so that it can assume I've drifted off and remind me.
5. As a user, I want the reminder to play a voice clip out loud, so that a spoken nudge is harder to ignore than a silent notification.
6. As a user, I want to choose whose voice nags me, so that the reminder feels personal enough to cut through my distraction.
7. As a user, I want to record my own audio clips directly in the app, so that I don't need external software to set up a voice.
8. As a user, I want to upload an existing audio file as my nag clip, so that I can reuse a recording I already have.
9. As a user, I want to save multiple named voice profiles, so that I can switch between different nag styles depending on my mood.
10. As a user, I want to record optional acknowledgment clips for marking a task done or snoozing it, so that the experience feels more responsive and rewarding.
11. As a user, I want the reminder to repeat every few minutes while I stay idle, so that a single missed nag doesn't let me drift indefinitely.
12. As a user, I want to configure the idle threshold and repeat interval, so that I can tune sensitivity to my own habits.
13. As a user, I want to mark a task done from the small window, so that I can clear it without switching to the full task list.
14. As a user, I want to snooze the current task's reminders for a while, so that I can take a legitimate short break without turning off the whole app.
15. As a user, I want to configure how long a snooze lasts, so that it matches how long I actually need.
16. As a user, I want to mute the entire app, so that I can stop all reminders when I genuinely need to (meetings, focus sessions elsewhere).
17. As a user, I want snooze and mute to reset automatically if the app restarts, so that a stale mute from yesterday doesn't silently carry over.
18. As a user, I want to see a flash or visual highlight on the small window when a reminder fires, so that I still notice it if my volume is down or I'm wearing headphones.
19. As a user, I want the nag clip to always finish playing rather than cut off abruptly, so that the reminder doesn't feel broken.
20. As a user, I want reminders to play without pausing or lowering my music/video, so that the app doesn't interfere with things I'm intentionally doing.
21. As a user, I want my task list to reset each day, so that I start fresh every morning.
22. As a user, I want unfinished tasks from yesterday to automatically carry over to the top of today's list, so that nothing I didn't finish gets silently lost.
23. As a user, I want to delete a task that's no longer relevant, so that it stops carrying over day after day.
24. As a user, I want to reorder my task list by dragging, so that I can re-prioritize whenever my day changes.
25. As a user, I want to manage my full task list, reordering, and voice profiles from a separate full window, so that the always-visible small window stays uncluttered.
26. As a user, I want to open the full window from the system tray icon, so that I can access task/voice management without hunting for the app.
27. As a first-time or empty-list user, I want the small window to show a friendly prompt to add a task when I have none, so that I know what to do next instead of seeing a blank window.
28. As a new user with no voice profile set up yet, I want the app to still track my tasks and flash visually on reminders, so that the tool is useful before I've recorded anything.
29. As a user, I want the app to launch automatically when I log into Windows, so that I don't have to remember to open it myself.
30. As a user, I want the app to keep running in the system tray when I close the small window, so that reminders don't stop just because I clicked the X.
31. As a user, I want a clear "Quit" option in the tray icon's menu, so that I have an explicit way to fully exit the app when I want to.

## Implementation Decisions

- Platform: Windows desktop only (v1). Built with Electron + TypeScript.
- Two windows:
  - **Sticky Note**: small, frameless, always-on-top BrowserWindow. Displays the Current Task text only, with Mark Done / Snooze / Mute controls. Flashes/highlights visually when a Reminder fires. Shows an empty-state prompt ("no tasks — add one") when there is no Current Task, linking to open Full View.
  - **Full View**: standard BrowserWindow, opened via the tray icon. Manages the Task List (add, reorder via drag, delete) and Voice Profiles (create, record/upload clips, switch active profile).
- System tray: Tray icon present at all times the app is running. Right-click menu includes "Open Full View" and "Quit." App registers as a login item (`app.setLoginItemSettings`) to launch at Windows login.
- **Reminder Engine (the seam)**: a pure, OS-independent module. Inputs: current Task List state (ordered tasks with status), idle duration, per-task Snooze state + expiry, app-wide Mute state, active Voice Profile, and configured thresholds (idle threshold, repeat interval, default snooze duration). Output: a decision — fire a Reminder now (and with which clip), or don't. Zero dependencies on Electron, real timers, real audio, or real OS APIs — driven entirely by externally-supplied "now" and "idle duration," making it fully unit-testable via constructed inputs.
- OS adapters around the Reminder Engine (thin, integration-tested only):
  - **Idle polling adapter**: polls Electron's `powerMonitor.getSystemIdleTime()` on an interval and feeds idle duration into the Reminder Engine.
  - **Audio adapter**: plays the selected clip (Nag Clip or Acknowledgment Clip) via the renderer's Audio API when the Reminder Engine signals a fire; does not duck or pause other system audio.
  - **Recording adapter**: captures microphone input via `getUserMedia` + `MediaRecorder` in Full View to produce a clip file.
  - **Persistence adapter**: reads/writes Task List and Voice Profile data (including clip files) to local disk under the app's userData path. No cloud sync, no accounts.
  - **Window/tray adapters**: own the actual BrowserWindow instances, tray icon, always-on-top behavior, and login-item registration.
- Task model: description, priority rank (position in ordered list), status (pending | done). Delete removes a task from the list entirely — distinct from Mark Done — and deleted tasks are excluded from next-day carry-over.
- Daily reset: on each new local day, a new Task List is derived from all carried-over pending tasks (kept in prior relative order) placed above any newly-added tasks. Done and Deleted tasks are never carried over.
- Voice Profile model: name, tone label (soft..aggressive — informational only, not used to auto-select anything), one required Nag Clip, optional Done Acknowledgment Clip, optional Snooze Acknowledgment Clip. Exactly one Voice Profile is active at a time; the app can have zero Voice Profiles, in which case Reminders fire with no audio (visual flash only).
- Configurable settings (stored with app data, editable from Full View): idle threshold (default 2 min), reminder repeat interval (default 5 min), default snooze duration (default 10 min).
- Snooze/Mute state is in-memory only, never persisted to disk — both reset to normal on every app restart.
- No AI voice cloning, no TTS, no dynamic insertion of task text or username into spoken audio (see ADR-0001) — the Current Task's text is only ever rendered as on-screen text in the Sticky Note.

## Testing Decisions

- Good tests here exercise the Reminder Engine's public decision function purely through inputs and outputs (task list snapshot + idle duration + snooze/mute state + thresholds in; fire-or-not + which-clip-to-play out) — never by inspecting internal state or mocking Electron.
- Reminder Engine unit tests should cover: idle threshold crossing triggers a fire; repeat interval re-fires while idle persists; a snoozed task suppresses firing until expiry; app mute suppresses firing regardless of task state; marking a task done stops further firing for it and promotes the next task; an empty task list never fires; carry-over ordering (unfinished tasks retain relative order, sit above new tasks, done/deleted tasks excluded); the zero-Voice-Profile case still signals a fire (for the visual flash) but with no clip.
- Task List carry-over/date-rollover logic should be tested as a pure function of (yesterday's list, today's date) → today's list, independent of any real clock or persistence.
- Adapters (idle polling, audio playback/recording, persistence, window/tray) get a light layer of integration/smoke tests only, confirming correct wiring into the Reminder Engine and Electron APIs — not exhaustive unit coverage, since their correctness is largely "does Electron's API do what it says."
- No existing codebase or prior art to reference — this is a greenfield project, built from `CONTEXT.md` and this spec.

## Out of Scope

- macOS/Linux support (Windows-only for v1).
- AI voice cloning or text-to-speech of arbitrary task text (see ADR-0001) — deferred as a possible v2.
- Auto-escalating tone/aggressiveness over time — tone is fixed per Voice Profile.
- Audio ducking/pausing of other system audio during a Reminder.
- Cloud sync, accounts, or multi-device support — fully local, single-machine.
- Multiple simultaneous task lists/projects (e.g. separate work vs. personal) — one Task List at a time.
- Persisting Snooze/Mute state across app restarts — always resets.
- Accessibility features (screen reader support, full keyboard navigation) beyond Electron's defaults — not explicitly designed for in this spec.
- Onboarding/tutorial flow beyond the empty-state prompt.

## Further Notes

- `CONTEXT.md` defines the canonical vocabulary (Task, Task List, Current Task, Idle, Reminder, Voice Profile, Soundboard, Nag Clip, Acknowledgment Clip, Sticky Note, Full View, Mark Done, Snooze, Mute, Delete) — implementers should use these terms throughout code and comments, not synonyms.
- ADR-0001 explains why Soundboard was chosen over AI voice cloning; this constrains several decisions above (e.g. no dynamic clip text).
- This spec assumes a single active Voice Profile at a time — multi-profile "quick switch" UX (e.g. a keyboard shortcut) was not designed and is left to implementation discretion within Full View.
