let draggedId = null;

// Help icons (the "?" badges) exist only for the Reminder Settings fields
// (Idle threshold, Reminder duration, Default snooze duration) -- static
// markup in index.html, not created here. Hover and click both show this
// same popover (hover previews it, click pins it open) so there's one
// consistent look rather than the browser's native title-attribute tooltip.
const helpPopover = document.createElement("div");
helpPopover.className = "help-popover";
helpPopover.hidden = true;
document.body.appendChild(helpPopover);
let pinnedHelpIcon = null;

// Positions the popover so it always shows in full, flipping to whichever
// side of the icon keeps it inside the window instead of getting clipped
// at the edge.
function showHelpPopover(icon) {
  helpPopover.textContent = icon.dataset.help;
  helpPopover.hidden = false; // must be visible to measure its size below

  const margin = 8;
  const iconRect = icon.getBoundingClientRect();
  const popoverRect = helpPopover.getBoundingClientRect();

  let left = iconRect.left;
  if (left + popoverRect.width > window.innerWidth - margin) {
    left = window.innerWidth - popoverRect.width - margin;
  }
  left = Math.max(margin, left);

  let top = iconRect.bottom + 6;
  if (top + popoverRect.height > window.innerHeight - margin) {
    top = iconRect.top - popoverRect.height - 6; // flip above the icon
  }
  top = Math.max(margin, top);

  helpPopover.style.left = `${left}px`;
  helpPopover.style.top = `${top}px`;
}

function hideHelpPopover() {
  helpPopover.hidden = true;
}

document.querySelectorAll(".help-icon").forEach((icon) => {
  icon.addEventListener("mouseenter", () => showHelpPopover(icon));
  icon.addEventListener("mouseleave", () => {
    if (pinnedHelpIcon !== icon) {
      hideHelpPopover();
    }
  });
});

document.addEventListener("click", (e) => {
  const icon = e.target.closest(".help-icon");
  if (!icon) {
    hideHelpPopover();
    pinnedHelpIcon = null;
    return;
  }
  if (pinnedHelpIcon === icon) {
    hideHelpPopover();
    pinnedHelpIcon = null;
    return;
  }
  showHelpPopover(icon);
  pinnedHelpIcon = icon;
});

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
  document.getElementById("reminder-duration-input").value = settings.reminderDurationMinutes;
  document.getElementById("default-snooze-input").value = settings.defaultSnoozeMinutes;
}

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const settings = await window.fullView.updateSettings({
    idleThresholdMinutes: Number(document.getElementById("idle-threshold-input").value),
    reminderDurationMinutes: Number(document.getElementById("reminder-duration-input").value),
    defaultSnoozeMinutes: Number(document.getElementById("default-snooze-input").value),
  });
  applySettings(settings);
});

window.fullView.getSettings().then(applySettings);

let pendingClip = null; // { blob, extension } | null
let voiceProfileState = { profiles: [], activeProfileId: null };
let activeRecorder = null; // { button, stop } | null — only one mic stream at a time

// MediaRecorder's WebM/Opus encoder loses several seconds of audio at the start of every
// recording in this Electron build (confirmed by decoding recordings back with
// AudioContext.decodeAudioData: held time and decoded time diverge by a large, consistent
// amount regardless of recording length). Capturing raw PCM directly via a ScriptProcessorNode
// and hand-encoding a WAV bypasses that encoder entirely and does not lose audio.
function pcmChunksToWavBlob(chunks, sampleRate) {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytesPerSample = 2;
  const dataSize = totalSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      let sample = Math.max(-1, Math.min(1, chunk[i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

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
  recordButton.dataset.idleLabel = "Record Again";
  recordButton.textContent = "Record Again";
  updateSaveEnabled();
}

// Shared by the create-form's Record button and every profile row's Done/Snooze
// Ack Clip Record buttons — only one microphone stream can usefully run at a time.
function toggleRecording(button, statusEl, onRecorded) {
  if (activeRecorder) {
    if (activeRecorder.button === button) {
      activeRecorder.stop();
    }
    return;
  }
  if (statusEl) {
    statusEl.textContent = "";
  }
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0; // avoid audible mic feedback; still needed to keep the graph flowing
      const chunks = [];

      processor.onaudioprocess = (e) => {
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      activeRecorder = {
        button,
        stop: () => {
          processor.disconnect();
          source.disconnect();
          silentGain.disconnect();
          stream.getTracks().forEach((track) => track.stop());
          const sampleRate = audioContext.sampleRate;
          audioContext.close();
          button.textContent = button.dataset.idleLabel || "Start Recording";
          activeRecorder = null;
          onRecorded(pcmChunksToWavBlob(chunks, sampleRate), "wav");
        },
      };
      button.textContent = "Stop Recording";
    })
    .catch((err) => {
      console.error("Microphone access failed.", err);
      if (statusEl) {
        statusEl.textContent = "Couldn't access the microphone.";
      }
    });
}

recordButton.addEventListener("click", () => {
  toggleRecording(recordButton, recordStatus, (blob, extension) => setPendingClip(blob, extension));
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
  await window.fullView.createVoiceProfile({
    name: nameInput.value.trim(),
    clipData,
    clipExtension: pendingClip.extension,
  });
  nameInput.value = "";
  fileInput.value = "";
  pendingClip = null;
  preview.hidden = true;
  preview.removeAttribute("src");
  delete recordButton.dataset.idleLabel;
  recordButton.textContent = "Start Recording";
  updateSaveEnabled();
});

async function saveAckClip(setter, profileId, blob, extension) {
  const clipData = await blob.arrayBuffer();
  await setter({ profileId, clipData, clipExtension: extension });
}

function buildAckClipRow(profileId, label, existingUrl, setter) {
  const section = document.createElement("div");
  section.className = "ack-clip-section";

  const header = document.createElement("div");
  header.className = "ack-clip-header";
  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  header.appendChild(labelSpan);
  section.appendChild(header);

  const body = document.createElement("div");
  body.className = "ack-clip-body";

  const player = document.createElement("div");
  player.className = "ack-clip-player";
  if (existingUrl) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = existingUrl;
    player.appendChild(audio);
  } else {
    const noneSpan = document.createElement("span");
    noneSpan.className = "no-clip-text";
    noneSpan.textContent = "No clip set";
    player.appendChild(noneSpan);
  }
  body.appendChild(player);

  const onCaptured = (blob, extension) => saveAckClip(setter, profileId, blob, extension);

  const actions = document.createElement("div");
  actions.className = "ack-clip-actions";

  const rowRecordButton = document.createElement("button");
  rowRecordButton.type = "button";
  rowRecordButton.className = "record-toggle-button";
  rowRecordButton.textContent = existingUrl ? "Record Again" : "Start Recording";
  rowRecordButton.dataset.idleLabel = rowRecordButton.textContent;
  const status = document.createElement("span");
  status.className = "record-status";
  rowRecordButton.addEventListener("click", () => toggleRecording(rowRecordButton, status, onCaptured));
  actions.appendChild(rowRecordButton);

  const rowFileInput = document.createElement("input");
  rowFileInput.type = "file";
  rowFileInput.accept = "audio/*";
  rowFileInput.addEventListener("change", () => {
    const file = rowFileInput.files[0];
    if (!file) {
      return;
    }
    const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
    onCaptured(file, match ? match[1] : "bin");
  });
  actions.appendChild(rowFileInput);
  actions.appendChild(status);

  body.appendChild(actions);
  section.appendChild(body);

  return section;
}

function renderVoiceProfileList() {
  const list = document.getElementById("voice-profile-list");
  list.innerHTML = "";
  for (const profile of voiceProfileState.profiles) {
    const li = document.createElement("li");
    const isActive = profile.id === voiceProfileState.activeProfileId;

    const header = document.createElement("div");
    header.className = "voice-profile-header";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = profile.name;
    header.appendChild(nameSpan);
    if (isActive) {
      const badge = document.createElement("span");
      badge.className = "active-badge";
      badge.textContent = "Active";
      header.appendChild(badge);
    } else {
      const activateButton = document.createElement("button");
      activateButton.type = "button";
      activateButton.textContent = "Set Active";
      activateButton.addEventListener("click", () => window.fullView.setActiveVoiceProfile(profile.id));
      header.appendChild(activateButton);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => window.fullView.deleteVoiceProfile(profile.id));
    header.appendChild(deleteButton);

    li.appendChild(header);

    const nagLabel = document.createElement("span");
    nagLabel.textContent = "Nag Clip";
    li.appendChild(nagLabel);

    const nagAudio = document.createElement("audio");
    nagAudio.controls = true;
    nagAudio.src = profile.nagClipUrl;
    li.appendChild(nagAudio);

    li.appendChild(
      buildAckClipRow(profile.id, "Done Acknowledgment Clip", profile.doneAckClipUrl, window.fullView.setDoneAckClip)
    );
    li.appendChild(
      buildAckClipRow(
        profile.id,
        "Snooze Acknowledgment Clip",
        profile.snoozeAckClipUrl,
        window.fullView.setSnoozeAckClip
      )
    );

    list.appendChild(li);
  }
}

function applyVoiceProfileState(state) {
  voiceProfileState = state ?? { profiles: [], activeProfileId: null };
  renderVoiceProfileList();
}

window.fullView.getVoiceProfileState().then(applyVoiceProfileState);
window.fullView.onVoiceProfileStateUpdated(applyVoiceProfileState);
