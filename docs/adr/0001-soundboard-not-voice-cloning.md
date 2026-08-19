# Soundboard, not AI voice cloning, for v1 Reminders

The original pitch called for reminders that speak the specific Task by name ("hey [name], [task] isn't done yet"), which implies real generative speech. We chose a Soundboard — fixed clips the user records or uploads — over AI voice cloning (e.g. a paid TTS/cloning API) for v1, because cloning means sending audio of real people (including celebrities) to a third party, carries real legal/ethical exposure if used without consent, and adds an ongoing API cost and cloud dependency. A Soundboard ships fully local with none of that risk, and validates the core idle-nagging loop fastest.

## Consequences

Because clips are static, a Reminder can never speak the Task's actual text — only generic phrasing. The Task's description is shown as on-screen text in the sticky note instead. Real per-task dynamic speech (via TTS or cloning) is a candidate v2 feature once the core loop is validated.
