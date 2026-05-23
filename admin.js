const STORAGE_KEY = "codex-todo-admin-draft-v3";

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
const ownerSelect = document.querySelector("#ownerSelect");
const ownerNameInput = document.querySelector("#ownerNameInput");
const ownerNoteInput = document.querySelector("#ownerNoteInput");
const ownerHint = document.querySelector("#ownerHint");

let currentFilter = "all";
let fileHandle = null;
let board = loadDraft();
let currentOwnerId = board.members[0]?.id ?? "member-1";

hydrateOwnerOptions();
render();
updateSaveCapability();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  updateCurrentMember((member) => {
    member.todos.unshift(createTodo(text));
  });

  persistDraft();
  render();
  form.reset();
  input.focus();
});

ownerSelect.addEventListener("change", () => {
  currentOwnerId = ownerSelect.value;
  render();
});

ownerNameInput.addEventListener("input", () => {
  updateCurrentMember((member) => {
    member.name = ownerNameInput.value.trim() || member.name;
  });

  persistDraft();
  hydrateOwnerOptions();
  render();
});

ownerNoteInput.addEventListener("input", () => {
  updateCurrentMember((member) => {
    member.note = ownerNoteInput.value.trim();
  });

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
  updateCurrentMember((member) => {
    member.todos = member.todos.filter((todo) => !todo.completed);
  });

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

  updateCurrentMember((member) => {
    member.todos = member.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: toggle.checked } : todo,
    );
  });

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

  updateCurrentMember((member) => {
    member.todos = member.todos.filter((todo) => todo.id !== id);
  });

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
      suggestedName: "todos.json",
    });

    fileHandle = handle;
    saveFileButton.disabled = false;
    updateStatus("已绑定文件。现在可以直接保存到 docs/todos.json。");
  } catch {
    updateStatus("未绑定文件。你也可以继续使用导出 JSON。");
  }
});

saveFileButton.addEventListener("click", async () => {
  if (!fileHandle) {
    updateStatus("请先绑定 docs/todos.json。");
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
    board = normalizeBoard(JSON.parse(text));
    currentOwnerId = board.members[0]?.id ?? "member-1";
    persistDraft();
    hydrateOwnerOptions();
    render();
    updateStatus(`已导入 ${file.name}。如已绑定 docs/todos.json，可直接点击“直接保存”。`);
  } catch {
    updateStatus("导入失败。请选择结构正确的多人 todos.json 文件。");
  } finally {
    fileInput.value = "";
  }
});

exportButton.addEventListener("click", () => {
  const payload = JSON.stringify(board, null, 2);
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "todos.json";
  link.click();
  URL.revokeObjectURL(url);
  updateStatus("已导出 todos.json。若当前环境不支持直接保存，请用它覆盖 docs/todos.json。");
});

resetDraftButton.addEventListener("click", () => {
  board = seedBoard();
  currentOwnerId = board.members[0].id;
  persistDraft();
  hydrateOwnerOptions();
  render();
  updateStatus("已重置为默认三人草稿。");
});

function loadDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return seedBoard();
    }

    return normalizeBoard(JSON.parse(stored));
  } catch {
    return seedBoard();
  }
}

function persistDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
}

function seedBoard() {
  return {
    members: [
      {
        id: "member-1",
        name: "小余",
        note: "本机编辑这一组任务。",
        todos: [
          createSeedTodo("整理今天最重要的三件事", false, "2026-05-24T09:00:00+08:00"),
          createSeedTodo("完成本周方案初稿", true, "2026-05-24T10:00:00+08:00"),
        ],
      },
      {
        id: "member-2",
        name: "小张",
        note: "独立任务清单，不受其他人影响。",
        todos: [
          createSeedTodo("整理客户反馈", false, "2026-05-24T09:30:00+08:00"),
          createSeedTodo("补充日报", false, "2026-05-24T11:00:00+08:00"),
        ],
      },
      {
        id: "member-3",
        name: "小李",
        note: "公开页会和其他两个人一起展示。",
        todos: [
          createSeedTodo("检查上线页面", true, "2026-05-24T08:45:00+08:00"),
          createSeedTodo("更新数据说明", false, "2026-05-24T12:00:00+08:00"),
        ],
      },
    ],
  };
}

function normalizeBoard(value) {
  const members = Array.isArray(value?.members) ? value.members : null;
  if (!members || members.length !== 3) {
    throw new Error("Invalid board");
  }

  return {
    members: members.map((member, index) => ({
      id: typeof member.id === "string" && member.id ? member.id : `member-${index + 1}`,
      name: typeof member.name === "string" && member.name ? member.name : `成员 ${index + 1}`,
      note: typeof member.note === "string" ? member.note : "",
      todos: normalizeTodos(member.todos),
    })),
  };
}

function normalizeTodos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((todo, index) => ({
    id: typeof todo.id === "string" && todo.id ? todo.id : `todo-${index + 1}-${Date.now()}`,
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
    id: crypto.randomUUID(),
    text,
    completed,
    createdAt,
  };
}

function getCurrentMember() {
  return board.members.find((member) => member.id === currentOwnerId) ?? board.members[0];
}

function updateCurrentMember(updater) {
  board.members = board.members.map((member) => {
    if (member.id !== currentOwnerId) {
      return member;
    }

    const nextMember = {
      ...member,
      todos: [...member.todos],
    };

    updater(nextMember);
    return nextMember;
  });
}

function hydrateOwnerOptions() {
  const currentValue = currentOwnerId;
  ownerSelect.innerHTML = "";

  board.members.forEach((member) => {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = member.name;
    ownerSelect.appendChild(option);
  });

  ownerSelect.value = board.members.some((member) => member.id === currentValue)
    ? currentValue
    : board.members[0].id;
}

function getVisibleTodos(member) {
  if (currentFilter === "active") {
    return member.todos.filter((todo) => !todo.completed);
  }

  if (currentFilter === "completed") {
    return member.todos.filter((todo) => todo.completed);
  }

  return member.todos;
}

function render() {
  const member = getCurrentMember();
  const visibleTodos = getVisibleTodos(member);
  const activeCount = member.todos.filter((todo) => !todo.completed).length;
  const completedCount = member.todos.length - activeCount;

  badge.textContent = `${member.todos.length} 项任务`;
  summary.textContent =
    member.todos.length === 0
      ? "还没有任务，先添加一条开始。"
      : `剩余 ${activeCount} 项，已完成 ${completedCount} 项。`;

  ownerNameInput.value = member.name;
  ownerNoteInput.value = member.note;
  ownerHint.textContent = member.note || "你可以给这一组任务写上自己的名字和备注。";

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
    await writable.write(JSON.stringify(board, null, 2));
    await writable.close();
    updateStatus("已直接保存到绑定文件。现在只需要提交并推送到 GitHub。");
  } catch {
    updateStatus("直接保存失败。请确认你绑定的是可写的 docs/todos.json，或改用导出 JSON。");
  }
}
