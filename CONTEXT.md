# ADHD Focus Popup

A Windows desktop app that keeps a single prioritized task visible in an always-on-top sticky note, and nags the user with a custom voice recording when they've gone idle.

## Language

**Task**:
A user-entered to-do item with a description and a priority rank. Has a status of pending or done.
_Avoid_: To-do, item

**Task List**:
The day's ordered set of Tasks, ranked by priority. Resets each day; unfinished Tasks carry over into the new list, keep their relative order, and are auto-promoted above newly added Tasks.
_Avoid_: Queue, backlog

**Current Task**:
The single top-priority pending Task in the Task List — the only Task the app ever reminds about.
_Avoid_: Active task, focus task

**Idle**:
The trigger condition for a Reminder: no keyboard or mouse input for a configurable threshold (default ~2 minutes). Distinct from the screen locking or the app losing window focus — both considered and rejected as the trigger.
_Avoid_: Inactive, away, screen off

**Reminder**:
A Voice Profile clip played back when the app is Idle and the Current Task is neither Done, Snoozed, nor the app Muted. Repeats on a configurable interval (default 5 minutes) for as long as Idle continues.
_Avoid_: Notification, alert

**Voice Profile**:
A named, saved set of audio clips the user recorded or uploaded, played back for Reminders. A user can save multiple Voice Profiles and switch between them. Tone (soft through aggressive) is a fixed property of the whole Voice Profile, not chosen per Reminder.
_Avoid_: Voice, character, persona

**Soundboard**:
The playback mechanism: fixed pre-recorded/uploaded clips played back verbatim. Because clips are static, a Reminder can only speak generic phrasing — it never speaks the Current Task's actual text, which is shown as on-screen text in the sticky note instead. Chosen over AI voice cloning for v1 — see [ADR-0001](./docs/adr/0001-soundboard-not-voice-cloning.md).
_Avoid_: Voice clone, TTS, synthesized voice

**Mark Done**:
The action that completes a Task permanently. No further Reminders fire for it.
_Avoid_: Complete, finish, check off

**Snooze**:
The action that temporarily silences Reminders for the Current Task, resuming automatically after a configurable duration (default 10 minutes).
_Avoid_: Pause, delay

**Mute**:
The app-wide toggle that stops all Reminders regardless of Task state, until turned back on. Distinct from Snooze, which only silences the Current Task and resumes on its own.
_Avoid_: Pause, disable

**Sticky Note**:
The small, always-on-top window that's visible at all times. Shows only the Current Task and three actions: Mark Done, Snooze, Mute.
_Avoid_: Popup, small window

**Full View**:
The separate window, opened from the tray icon, where the user manages the whole Task List — adding, reordering, deleting — and creates or edits Voice Profiles. Not always visible. Displayed to the user as "Settings" (window title, tray menu label) as of 2026-08-20 — this reverses the original "_Avoid_: settings" guidance below, kept here as the internal/code term.
_Avoid_ (internal code/comments only, no longer the on-screen label): Dashboard, main window

**Nag Clip**:
The one required audio clip in a Voice Profile — played for every Reminder.
_Avoid_: Reminder clip

**Acknowledgment Clip**:
An optional audio clip in a Voice Profile, played when a Task is marked Done or Snoozed. Distinct from the required Nag Clip.
_Avoid_: Confirmation clip

**Delete**:
The action that removes a Task entirely, distinct from Mark Done. A Deleted Task does not carry over to the next day's Task List.
_Avoid_: Remove, discard
