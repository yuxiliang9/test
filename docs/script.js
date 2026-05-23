const memberTabs = document.querySelector("#memberTabs");
const memberBadge = document.querySelector("#memberBadge");
const memberName = document.querySelector("#memberName");
const memberNote = document.querySelector("#memberNote");
const memberStats = document.querySelector("#memberStats");
const todoList = document.querySelector("#todoList");
const viewStatus = document.querySelector("#viewStatus");
const refreshButton = document.querySelector("#refreshButton");
const template = document.querySelector("#todoItemTemplate");

const MEMBER_FILES = [
  "./data/member-1.json",
  "./data/member-2.json",
  "./data/member-3.json",
];

let members = [];
let selectedMemberId = "";

renderLoadingState();
loadMembers();

refreshButton.addEventListener("click", () => {
  loadMembers();
});

memberTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-member-id]");
  if (!button) {
    return;
  }

  selectedMemberId = button.dataset.memberId;
  render();
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
    selectedMemberId = members.some((member) => member.id === selectedMemberId)
      ? selectedMemberId
      : members[0]?.id ?? "";
    viewStatus.textContent = "公开只读页已同步最新任务数据。";
    render();
  } catch {
    members = [];
    selectedMemberId = "";
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
  const member = getSelectedMember();
  renderTabs();

  if (!member) {
    renderEmptyMember("当前没有公开任务数据。");
    return;
  }

  const activeCount = member.todos.filter((todo) => !todo.completed).length;
  const completedCount = member.todos.length - activeCount;

  memberBadge.textContent = member.name;
  memberName.textContent = member.name;
  memberNote.textContent = member.note || "这是一组独立的个人清单。";
  memberStats.textContent = `${member.todos.length} 项任务 · 剩余 ${activeCount} 项 · 已完成 ${completedCount} 项`;

  todoList.innerHTML = "";

  if (member.todos.length === 0) {
    renderListEmptyState("当前没有任务。");
    return;
  }

  member.todos.forEach((todo) => {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");

    if (todo.completed) {
      item.classList.add("is-completed");
    }

    fragment.querySelector(".todo-text").textContent = todo.text;
    fragment.querySelector(".todo-meta").textContent = formatMeta(todo);
    fragment.querySelector(".todo-label").textContent = todo.completed ? "已完成" : "进行中";

    todoList.appendChild(fragment);
  });
}

function renderTabs() {
  memberTabs.innerHTML = "";

  members.forEach((member) => {
    const button = document.createElement("button");
    button.className = "member-tab";
    button.type = "button";
    button.dataset.memberId = member.id;
    button.textContent = member.name;
    button.classList.toggle("is-active", member.id === selectedMemberId);
    memberTabs.appendChild(button);
  });
}

function getSelectedMember() {
  return members.find((member) => member.id === selectedMemberId) ?? members[0];
}

function renderLoadingState() {
  memberBadge.textContent = "加载中";
  memberName.textContent = "正在加载";
  memberNote.textContent = "正在读取三个人的任务数据...";
  memberStats.textContent = "";
  todoList.innerHTML = "";
  renderListEmptyState("正在加载任务数据...");
}

function renderErrorState() {
  memberBadge.textContent = "加载失败";
  viewStatus.textContent = "读取失败。请确认部署时包含 docs/data/member-1.json、member-2.json、member-3.json。";
  renderTabs();
  renderEmptyMember("任务数据暂时不可用，请稍后刷新。");
}

function renderEmptyMember(message) {
  memberName.textContent = "暂无数据";
  memberNote.textContent = message;
  memberStats.textContent = "";
  todoList.innerHTML = "";
  renderListEmptyState(message);
}

function renderListEmptyState(message) {
  const state = document.createElement("li");
  state.className = "empty-state";
  state.textContent = message;
  todoList.appendChild(state);
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
