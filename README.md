# Todo List 发布说明

这个项目现在分成两部分：

- `admin.html`、`admin.css`、`admin.js`
  - 本地管理页，只给你自己打开编辑
- `docs/`
  - 公开只读页，部署时只发布这个目录

## 三人模式

现在是三个人的独立清单结构：

- 每个人都有自己的 `name`
- 每个人都有独立的 JSON 文件
- 三组任务会同时显示在公开页
- 每个人的本地管理页只编辑自己的文件，不需要选择名字

## 本地编辑

推荐方式：

1. 运行 `start-local-admin.ps1`
2. 每个人打开自己的页面：
   - 小张：`http://localhost:4173/admin-member-1.html`
   - 小肖：`http://localhost:4173/admin-member-2.html`
   - 小林：`http://localhost:4173/admin-member-3.html`
3. 点击“绑定个人 JSON”
4. 选择自己的文件：
   - 小张：`docs/data/member-1.json`
   - 小肖：`docs/data/member-2.json`
   - 小林：`docs/data/member-3.json`
5. 在页面里新增、完成、删除任务
6. 点击“直接保存”

备用方式：

1. 打开 `admin.html`
2. 在页面里编辑任务
3. 点击“导出 JSON”
4. 用导出的 `todos.json` 覆盖 `docs/todos.json`

管理页会把当前草稿临时保存在你本机浏览器里，方便你下次继续改。

## 本地打开

直接运行：

- `powershell -ExecutionPolicy Bypass -File .\start-local-admin.ps1`

然后在浏览器里打开：

- `http://localhost:4173/admin-member-1.html`
- `http://localhost:4173/admin-member-2.html`
- `http://localhost:4173/admin-member-3.html`

## 对外发布

最简单的是 GitHub Pages：

1. 把这个项目放到 GitHub 仓库
2. 进入仓库 `Settings`
3. 打开 `Pages`
4. 在 `Build and deployment` 里选择：
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/docs`
5. 保存

发布后，GitHub Pages 会对外提供 `docs/index.html` 对应的网站。

## 每次更新流程

1. 打开本地 `admin.html`
2. 修改任务
3. 直接保存到自己的 `docs/data/member-*.json`
4. 运行 `powershell -ExecutionPolicy Bypass -File .\publish.ps1`
5. 如果已经配置了 GitHub 远端，它会自动推送

如果你没有通过 localhost 打开管理页，就改用导出 JSON 的备用流程。

外网用户只能看到 `docs/` 里的只读页面，没有编辑按钮。
