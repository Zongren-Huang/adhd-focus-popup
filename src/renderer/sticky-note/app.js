let currentTaskId = null;
let muted = false;
let lastReminderState = { muted: false, snoozedTaskId: null };
let flashTimeoutId = null;

function render(tasks) {
  const current = tasks.find((task) => task.status === "pending") ?? null;
  currentTaskId = current ? current.id : null;

  document.getElementById("task-view").hidden = !current;
  document.getElementById("empty-state").hidden = !!current;
  if (current) {
    document.getElementById("task-text").textContent = current.description;
  }
  applyReminderState(lastReminderState);
}

function applyReminderState(state) {
  lastReminderState = state;
  muted = state.muted;

  const muteButton = document.getElementById("mute-button");
  muteButton.textContent = muted ? "Unmute" : "Mute";
  muteButton.classList.toggle("active", muted);

  const isSnoozed = state.snoozedTaskId !== null && state.snoozedTaskId === currentTaskId;
  const snoozeButton = document.getElementById("snooze-button");
  snoozeButton.textContent = isSnoozed ? "Snoozed" : "Snooze";
  snoozeButton.disabled = isSnoozed;
}

function flash() {
  const body = document.body;
  body.classList.remove("reminder-flash");
  void body.offsetWidth;
  body.classList.add("reminder-flash");
  clearTimeout(flashTimeoutId);
  flashTimeoutId = setTimeout(() => body.classList.remove("reminder-flash"), 700);
}

document.getElementById("mark-done-button").addEventListener("click", () => {
  if (currentTaskId) {
    window.stickyNote.markDone(currentTaskId);
  }
});

document.getElementById("add-task-button").addEventListener("click", () => {
  window.stickyNote.openFullView();
});

document.getElementById("snooze-button").addEventListener("click", async () => {
  applyReminderState(await window.stickyNote.snooze());
});

document.getElementById("mute-button").addEventListener("click", async () => {
  applyReminderState(await window.stickyNote.setMuted(!muted));
});

window.stickyNote.getAllTasks().then(render);
window.stickyNote.onTasksUpdated(render);
window.stickyNote.getReminderState().then(applyReminderState);
window.stickyNote.onReminderStateUpdated(applyReminderState);
window.stickyNote.onReminderFired((nagClipUrl) => {
  flash();
  if (nagClipUrl) {
    new Audio(nagClipUrl).play().catch((err) => console.error("Failed to play Nag Clip.", err));
  }
});
