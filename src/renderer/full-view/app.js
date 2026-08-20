let draggedId = null;

function render(tasks) {
  const list = document.getElementById("task-list");
  list.innerHTML = "";
  for (const task of tasks) {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.id = task.id;
    if (task.status === "done") {
      li.classList.add("done");
    }

    const text = document.createElement("span");
    text.textContent = task.description;
    li.appendChild(text);

    if (task.status === "pending") {
      const doneBtn = document.createElement("button");
      doneBtn.textContent = "Mark Done";
      doneBtn.addEventListener("click", () => window.fullView.markDone(task.id));
      li.appendChild(doneBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => window.fullView.deleteTask(task.id));
    li.appendChild(deleteBtn);

    li.addEventListener("dragstart", () => {
      draggedId = task.id;
    });
    li.addEventListener("dragover", (e) => e.preventDefault());
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      if (draggedId === null || draggedId === task.id) {
        return;
      }
      const ids = [...list.children].map((el) => el.dataset.id);
      const from = ids.indexOf(draggedId);
      ids.splice(from, 1);
      const dropIndex = ids.indexOf(task.id);
      const before = e.offsetY < li.offsetHeight / 2;
      ids.splice(before ? dropIndex : dropIndex + 1, 0, draggedId);
      window.fullView.reorderTasks(ids);
      draggedId = null;
    });

    list.appendChild(li);
  }
}

document.getElementById("add-task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("add-task-input");
  const description = input.value.trim();
  if (!description) {
    return;
  }
  await window.fullView.addTask(description);
  input.value = "";
});

window.fullView.getAllTasks().then(render);
window.fullView.onTasksUpdated(render);
