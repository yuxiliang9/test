const boardContainer = document.querySelector("#boardContainer");
const viewStatus = document.querySelector("#viewStatus");
const refreshButton = document.querySelector("#refreshButton");
const template = document.querySelector("#memberBoardTemplate");

const MEMBER_FILES = [
  "./data/member-1.json",
  "./data/member-2.json",
  "./data/member-3.json",
];

let members = [];

renderLoadingState();
loadMembers();

refreshButton.addEventListener("click", () => {
  loadMembers();
});

async function loadMembers() {
  refreshButton.disabled = true;
  refreshButton.textContent = "刷新中...";
  viewStatus.textContent = "正在加载三个人的任务数据...";

  try {
    const results = await Promise.all(
      MEMBER_FILES.map(async (file, index) => {
        const response = await fetch(file, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Load failed: ${file}`);
        }

        return normalizeMember(await response.json(), index);
      }),
    );

    members = results;
    viewStatus.textContent = "公开只读页已同步最新任务数据。";
    render();
  } catch {
    members = [];
    renderErrorState();
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "刷新数据";
  }
}

function normalizeMember(value, index) {
  return {
    id: typeof value?.id === "string" && value.id ? value.id : `member-${index + 1}`,
    name: typeof value?.name === "string" && value.name ? value.name : `成员 ${index + 1}`,
    note: typeof value?.note === "string" ? value.note : "",
    todos: Array.isArray(value?.todos)
      ? value.todos.map((todo, todoIndex) => ({
          id: typeof todo.id === "string" && todo.id ? todo.id : `todo-${index + 1}-${todoIndex + 1}`,
          text: typeof todo.text === "string" ? todo.text : "",
          completed: Boolean(todo.completed),
          createdAt:
            typeof todo.createdAt === "string" && todo.createdAt
              ? todo.createdAt
              : new Date().toISOString(),
        }))
      : [],
  };
}

function render() {
  boardContainer.innerHTML = "";

  if (members.length === 0) {
    renderEmptyState("当前没有公开任务数据。");
    return;
  }

  members.forEach((member) => {
    const fragment = template.content.cloneNode(true);
    const name = fragment.querySelector(".member-name");
    const note = fragment.querySelector(".member-note");
    const stats = fragment.querySelector(".member-stats");
    const list = fragment.querySelector(".member-list");
    const activeCount = member.todos.filter((todo) => !todo.completed).length;
    const completedCount = member.todos.length - activeCount;

    name.textContent = member.name;
    note.textContent = member.note || "这是一组独立的个人清单。";
    stats.textContent = `${member.todos.length} 项任务 · 剩余 ${activeCount} 项 · 已完成 ${completedCount} 项`;

    if (member.todos.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty-state";
      emptyItem.textContent = "当前没有任务。";
      list.appendChild(emptyItem);
    } else {
      member.todos.forEach((todo) => {
        const item = document.createElement("li");
        item.className = "todo-item";
        if (todo.completed) {
          item.classList.add("is-completed");
        }

        item.innerHTML = `
          <span class="todo-state" aria-hidden="true"></span>
          <div class="todo-content">
            <p class="todo-text"></p>
            <span class="todo-meta"></span>
          </div>
          <span class="todo-label"></span>
        `;

        item.querySelector(".todo-text").textContent = todo.text;
        item.querySelector(".todo-meta").textContent = formatMeta(todo);
        item.querySelector(".todo-label").textContent = todo.completed ? "已完成" : "进行中";

        list.appendChild(item);
      });
    }

    boardContainer.appendChild(fragment);
  });
}

function renderLoadingState() {
  boardContainer.innerHTML = "";
  renderEmptyState("正在加载三个人的任务数据...");
}

function renderErrorState() {
  viewStatus.textContent = "读取失败。请确认部署时包含 docs/data/member-1.json、member-2.json、member-3.json。";
  boardContainer.innerHTML = "";
  renderEmptyState("任务数据暂时不可用，请稍后刷新。");
}

function renderEmptyState(message) {
  const state = document.createElement("div");
  state.className = "empty-state";
  state.textContent = message;
  boardContainer.appendChild(state);
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
