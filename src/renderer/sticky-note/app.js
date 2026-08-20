let currentTaskId = null;
let muted = false;
let lastReminderState = { muted: false, snoozedTaskId: null };
let flashTimeoutId = null;

function render(tasks) {
  const currentIndex = tasks.findIndex((task) => task.status === "pending");
  const current = currentIndex === -1 ? null : tasks[currentIndex];
  currentTaskId = current ? current.id : null;

  document.getElementById("task-view").hidden = !current;
  document.getElementById("empty-state").hidden = !!current;

  const previousEl = document.getElementById("previous-task");
  const upcomingEl = document.getElementById("upcoming-task");

  if (current) {
    document.getElementById("task-text").textContent = current.description;

    // Every task before the Current Task is necessarily Done (otherwise one of
    // them would be Current instead), so this is always the most recently
    // completed task, if any.
    const previous = currentIndex > 0 ? tasks[currentIndex - 1] : null;
    previousEl.hidden = !previous;
    if (previous) {
      previousEl.textContent = previous.description;
    }

    const upcoming = tasks.slice(currentIndex + 1).find((task) => task.status === "pending") ?? null;
    upcomingEl.hidden = !upcoming;
    if (upcoming) {
      upcomingEl.textContent = upcoming.description;
    }
  } else {
    previousEl.hidden = true;
    upcomingEl.hidden = true;
    document.getElementById("empty-state-message").textContent =
      tasks.length > 0 ? "You've done everything, add more tasks!" : "No Current Task.";
  }

  applyReminderState(lastReminderState);
}

function applyReminderState(state) {
  lastReminderState = state;
  muted = state.muted;

  document.getElementById("reminder-toggle").checked = !muted;
  document.getElementById("reminder-off-status").hidden = !muted;

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

document.getElementById("reminder-toggle").addEventListener("change", async (e) => {
  applyReminderState(await window.stickyNote.setMuted(!e.target.checked));
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
window.stickyNote.onPlayClip((clipUrl) => {
  new Audio(clipUrl).play().catch((err) => console.error("Failed to play Acknowledgment Clip.", err));
});
