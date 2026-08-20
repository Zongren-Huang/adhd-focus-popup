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

function applySettings(settings) {
  document.getElementById("idle-threshold-input").value = settings.idleThresholdMinutes;
  document.getElementById("repeat-interval-input").value = settings.repeatIntervalMinutes;
  document.getElementById("default-snooze-input").value = settings.defaultSnoozeMinutes;
}

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const settings = await window.fullView.updateSettings({
    idleThresholdMinutes: Number(document.getElementById("idle-threshold-input").value),
    repeatIntervalMinutes: Number(document.getElementById("repeat-interval-input").value),
    defaultSnoozeMinutes: Number(document.getElementById("default-snooze-input").value),
  });
  applySettings(settings);
});

window.fullView.getSettings().then(applySettings);

let pendingClip = null; // { blob, extension } | null
let mediaRecorder = null;
let recordedChunks = [];

const nameInput = document.getElementById("voice-profile-name-input");
const recordButton = document.getElementById("record-toggle-button");
const recordStatus = document.getElementById("record-status");
const fileInput = document.getElementById("nag-clip-file-input");
const preview = document.getElementById("nag-clip-preview");
const saveButton = document.getElementById("save-voice-profile-button");

function updateSaveEnabled() {
  saveButton.disabled = !(nameInput.value.trim() && pendingClip);
}

function setPendingClip(blob, extension) {
  pendingClip = { blob, extension };
  preview.src = URL.createObjectURL(blob);
  preview.hidden = false;
  updateSaveEnabled();
}

recordButton.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    return;
  }
  recordStatus.textContent = "";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };
    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType;
      const match = /audio\/([a-zA-Z0-9]+)/.exec(mimeType);
      setPendingClip(new Blob(recordedChunks, { type: mimeType }), match ? match[1] : "webm");
      stream.getTracks().forEach((track) => track.stop());
      recordButton.textContent = "Start Recording";
    };
    mediaRecorder.start();
    recordButton.textContent = "Stop Recording";
  } catch (err) {
    console.error("Microphone access failed.", err);
    recordStatus.textContent = "Couldn't access the microphone.";
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) {
    return;
  }
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  setPendingClip(file, match ? match[1] : "bin");
});

nameInput.addEventListener("input", updateSaveEnabled);

document.getElementById("voice-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!pendingClip) {
    return;
  }
  const clipData = await pendingClip.blob.arrayBuffer();
  await window.fullView.saveVoiceProfile({
    name: nameInput.value.trim(),
    clipData,
    clipExtension: pendingClip.extension,
  });
  pendingClip = null;
  updateSaveEnabled();
});

function applyVoiceProfile(profileView) {
  if (profileView) {
    nameInput.value = profileView.name;
    preview.src = profileView.nagClipUrl;
    preview.hidden = false;
  }
  updateSaveEnabled();
}

window.fullView.getVoiceProfile().then(applyVoiceProfile);
window.fullView.onVoiceProfileUpdated(applyVoiceProfile);
