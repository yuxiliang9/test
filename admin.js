const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const list = document.querySelector("#todoList");
const summary = document.querySelector("#taskSummary");
const badge = document.querySelector("#taskBadge");
const filterGroup = document.querySelector("#filters");
const clearCompletedButton = document.querySelector("#clearCompleted");
const template = document.querySelector("#todoItemTemplate");
const bindFileButton = document.querySelector("#bindFileButton");
const saveFileButton = document.querySelector("#saveFileButton");
const importButton = document.querySelector("#importButton");
const exportButton = document.querySelector("#exportButton");
const resetDraftButton = document.querySelector("#resetDraft");
const fileInput = document.querySelector("#fileInput");
const fileStatus = document.querySelector("#fileStatus");
const ownerNameInput = document.querySelector("#ownerNameInput");
const ownerNoteInput = document.querySelector("#ownerNoteInput");
const ownerHint = document.querySelector("#ownerHint");
const pageTitle = document.querySelector("#pageTitle");
const pageSubtitle = document.querySelector("#pageSubtitle");
const memberBadge = document.querySelector("#memberBadge");

const config = readPageConfig();
const STORAGE_KEY = `codex-todo-admin-draft-${config.id}`;

let currentFilter = "all";
let fileHandle = null;
let member = loadDraft();

render();
updateSaveCapability();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  member.todos.unshift(createTodo(text));
  persistDraft();
  render();
  form.reset();
  input.focus();
});

ownerNameInput.addEventListener("input", () => {
  member.name = ownerNameInput.value.trim() || config.defaultName;
  persistDraft();
  render();
});

ownerNoteInput.addEventListener("input", () => {
  member.note = ownerNoteInput.value.trim();
  persistDraft();
  render();
});

filterGroup.addEventListener("click", (event) => {
  const button = event.target.closest(".filter");
  if (!button) {
    return;
  }

  currentFilter = button.dataset.filter;
  render();
});

clearCompletedButton.addEventListener("click", () => {
  member.todos = member.todos.filter((todo) => !todo.completed);
  persistDraft();
  render();
});

list.addEventListener("change", (event) => {
  const toggle = event.target.closest(".todo-toggle");
  if (!toggle) {
    return;
  }

  const item = event.target.closest(".todo-item");
  if (!item) {
    return;
  }

  const { id } = item.dataset;
  member.todos = member.todos.map((todo) =>
    todo.id === id ? { ...todo, completed: toggle.checked } : todo,
  );

  persistDraft();
  render();
});

list.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");
  if (!deleteButton) {
    return;
  }

  const item = event.target.closest(".todo-item");
  if (!item) {
    return;
  }

  const { id } = item.dataset;
  member.todos = member.todos.filter((todo) => todo.id !== id);
  persistDraft();
  render();
});

importButton.addEventListener("click", () => {
  fileInput.click();
});

bindFileButton.addEventListener("click", async () => {
  if (!supportsDirectSave()) {
    updateStatus("当前浏览器环境不支持直接保存。请通过 localhost 打开本页，或继续使用导出 JSON。");
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [
        {
          description: "JSON Files",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
      suggestedName: config.fileName,
    });

    fileHandle = handle;
    saveFileButton.disabled = false;
    updateStatus(`已绑定文件。现在可以直接保存到 ${config.fileLabel}。`);
  } catch {
    updateStatus("未绑定文件。你也可以继续使用导出 JSON。");
  }
});

saveFileButton.addEventListener("click", async () => {
  if (!fileHandle) {
    updateStatus(`请先绑定 ${config.fileLabel}。`);
    return;
  }

  await saveToBoundFile();
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    member = normalizeMember(JSON.parse(text));
    persistDraft();
    render();
    updateStatus(`已导入 ${file.name}。如已绑定 ${config.fileLabel}，可直接点击“直接保存”。`);
  } catch {
    updateStatus("导入失败。请选择结构正确的个人 JSON 文件。");
  } finally {
    fileInput.value = "";
  }
});

exportButton.addEventListener("click", () => {
  const payload = JSON.stringify(member, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = config.fileName;
  link.click();
  URL.revokeObjectURL(url);
  updateStatus(`已导出 ${config.fileName}。若当前环境不支持直接保存，请用它覆盖 ${config.fileLabel}。`);
});

resetDraftButton.addEventListener("click", () => {
  member = seedMember();
  persistDraft();
  render();
  updateStatus("已重置为当前成员的默认草稿。");
});

function readPageConfig() {
  const { dataset } = document.body;
  const id = dataset.memberId || "member-1";
  const defaultName = dataset.memberName || "小张";
  const fileName = dataset.memberFile || `${id}.json`;

  return {
    id,
    defaultName,
    fileName,
    fileLabel: `docs/data/${fileName}`,
  };
}

function loadDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return seedMember();
    }

    return normalizeMember(JSON.parse(stored));
  } catch {
    return seedMember();
  }
}

function persistDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(member));
}

function seedMember() {
  return {
    id: config.id,
    name: config.defaultName,
    note: "这是我的个人任务清单。",
    todos: [
      createSeedTodo("整理今天最重要的三件事", false, "2026-05-24T09:00:00+08:00"),
      createSeedTodo("同步当前任务进展", false, "2026-05-24T10:00:00+08:00"),
    ],
  };
}

function normalizeMember(value) {
  return {
    id: config.id,
    name: typeof value?.name === "string" && value.name ? value.name : config.defaultName,
    note: typeof value?.note === "string" ? value.note : "",
    todos: normalizeTodos(value?.todos),
  };
}

function normalizeTodos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((todo, index) => ({
    id: typeof todo.id === "string" && todo.id ? todo.id : `${config.id}-todo-${index + 1}`,
    text: typeof todo.text === "string" ? todo.text : "",
    completed: Boolean(todo.completed),
    createdAt:
      typeof todo.createdAt === "string" && todo.createdAt
        ? todo.createdAt
        : new Date().toISOString(),
  }));
}

function createTodo(text) {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

function createSeedTodo(text, completed, createdAt) {
  return {
    id: `${config.id}-${crypto.randomUUID()}`,
    text,
    completed,
    createdAt,
  };
}

function getVisibleTodos() {
  if (currentFilter === "active") {
    return member.todos.filter((todo) => !todo.completed);
  }

  if (currentFilter === "completed") {
    return member.todos.filter((todo) => todo.completed);
  }

  return member.todos;
}

function render() {
  const visibleTodos = getVisibleTodos();
  const activeCount = member.todos.filter((todo) => !todo.completed).length;
  const completedCount = member.todos.length - activeCount;

  pageTitle.textContent = `${member.name}的个人任务`;
  pageSubtitle.textContent = `这个编辑页只写入 ${config.fileLabel}，不会修改另外两个人的清单。`;
  memberBadge.textContent = member.name;
  badge.textContent = `${member.todos.length} 项任务`;
  summary.textContent =
    member.todos.length === 0
      ? "还没有任务，先添加一条开始。"
      : `剩余 ${activeCount} 项，已完成 ${completedCount} 项。`;

  ownerNameInput.value = member.name;
  ownerNoteInput.value = member.note;
  ownerHint.textContent = member.note || "这里会显示在公开总览页中。";

  [...filterGroup.querySelectorAll(".filter")].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === currentFilter);
  });

  clearCompletedButton.disabled = completedCount === 0;
  clearCompletedButton.style.opacity = completedCount === 0 ? "0.45" : "1";
  clearCompletedButton.style.cursor = completedCount === 0 ? "not-allowed" : "pointer";

  list.innerHTML = "";

  if (visibleTodos.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "当前筛选下没有任务，切换筛选或添加新任务。";
    list.appendChild(emptyState);
    return;
  }

  visibleTodos.forEach((todo) => {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");
    const toggle = fragment.querySelector(".todo-toggle");
    const text = fragment.querySelector(".todo-text");
    const meta = fragment.querySelector(".todo-meta");

    item.dataset.id = todo.id;
    item.classList.toggle("is-completed", todo.completed);
    toggle.checked = todo.completed;
    text.textContent = todo.text;
    meta.textContent = formatMeta(todo);

    list.appendChild(fragment);
  });
}

function formatMeta(todo) {
  const date = new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(todo.createdAt));

  return todo.completed ? `已完成 · ${date}` : `创建于 · ${date}`;
}

function updateStatus(message) {
  fileStatus.textContent = message;
}

function updateSaveCapability() {
  saveFileButton.disabled = !fileHandle;

  if (!supportsDirectSave()) {
    bindFileButton.textContent = "当前环境不支持直存";
    bindFileButton.disabled = true;
  }
}

function supportsDirectSave() {
  return window.isSecureContext && typeof window.showOpenFilePicker === "function";
}

async function saveToBoundFile() {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(member, null, 2));
    await writable.close();
    updateStatus("已直接保存到绑定文件。现在只需要提交并推送到 GitHub。");
  } catch {
    updateStatus(`直接保存失败。请确认你绑定的是可写的 ${config.fileLabel}，或改用导出 JSON。`);
  }
}
