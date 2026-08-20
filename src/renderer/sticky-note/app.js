let currentTaskId = null;

function render(tasks) {
  const current = tasks.find((task) => task.status === "pending") ?? null;
  currentTaskId = current ? current.id : null;

  document.getElementById("task-view").hidden = !current;
  document.getElementById("empty-state").hidden = !!current;
  if (current) {
    document.getElementById("task-text").textContent = current.description;
  }
}

document.getElementById("mark-done-button").addEventListener("click", () => {
  if (currentTaskId) {
    window.stickyNote.markDone(currentTaskId);
  }
});

document.getElementById("add-task-button").addEventListener("click", () => {
  window.stickyNote.openFullView();
});

window.stickyNote.getAllTasks().then(render);
window.stickyNote.onTasksUpdated(render);
