const list = document.querySelector("#todoList");
const summary = document.querySelector("#taskSummary");
const badge = document.querySelector("#taskBadge");
const filterGroup = document.querySelector("#filters");
const refreshButton = document.querySelector("#refreshButton");
const template = document.querySelector("#todoItemTemplate");
const viewStatus = document.querySelector("#viewStatus");

let currentFilter = "all";
let todos = [];

renderLoadingState();
loadTodos();

filterGroup.addEventListener("click", (event) => {
  const button = event.target.closest(".filter");
  if (!button) {
    return;
  }

  currentFilter = button.dataset.filter;
  render();
});

refreshButton.addEventListener("click", () => {
  loadTodos();
});

async function loadTodos() {
  refreshButton.disabled = true;
  refreshButton.textContent = "刷新中...";
  viewStatus.textContent = "正在加载任务数据...";

  try {
    const response = await fetch("./todos.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Load failed");
    }

    const data = await response.json();
    todos = normalizeTodos(data);
    viewStatus.textContent = "公开只读页已同步最新任务数据。";
    render();
  } catch {
    todos = [];
    renderErrorState();
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "刷新数据";
  }
}

function normalizeTodos(value) {
  if (!Array.isArray(value)) {
    throw new Error("Invalid todos");
  }

  return value.map((todo, index) => ({
    id: typeof todo.id === "string" && todo.id ? todo.id : `todo-${index + 1}`,
    text: typeof todo.text === "string" ? todo.text : "",
    completed: Boolean(todo.completed),
    createdAt:
      typeof todo.createdAt === "string" && todo.createdAt
        ? todo.createdAt
        : new Date().toISOString(),
  }));
}

function getVisibleTodos() {
  if (currentFilter === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (currentFilter === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

function render() {
  const visibleTodos = getVisibleTodos();
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  badge.textContent = `${todos.length} 项任务`;
  summary.textContent =
    todos.length === 0
      ? "当前没有公开任务。"
      : `剩余 ${activeCount} 项，已完成 ${completedCount} 项。`;

  [...filterGroup.querySelectorAll(".filter")].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === currentFilter);
  });

  list.innerHTML = "";

  if (visibleTodos.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent = "当前筛选下没有任务。";
    list.appendChild(emptyState);
    return;
  }

  visibleTodos.forEach((todo) => {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");
    const text = fragment.querySelector(".todo-text");
    const meta = fragment.querySelector(".todo-meta");
    const label = fragment.querySelector(".todo-label");

    item.dataset.id = todo.id;
    item.classList.toggle("is-completed", todo.completed);
    text.textContent = todo.text;
    meta.textContent = formatMeta(todo);
    label.textContent = todo.completed ? "已完成" : "进行中";

    list.appendChild(fragment);
  });
}

function renderLoadingState() {
  badge.textContent = "加载中";
  summary.textContent = "正在加载...";
  list.innerHTML = "";

  const emptyState = document.createElement("li");
  emptyState.className = "empty-state";
  emptyState.textContent = "正在加载任务数据...";
  list.appendChild(emptyState);
}

function renderErrorState() {
  badge.textContent = "加载失败";
  summary.textContent = "无法读取 todos.json。";
  viewStatus.textContent = "读取失败。请确认部署时包含 docs/todos.json。";
  list.innerHTML = "";

  const emptyState = document.createElement("li");
  emptyState.className = "empty-state";
  emptyState.textContent = "任务数据暂时不可用，请稍后刷新。";
  list.appendChild(emptyState);
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
