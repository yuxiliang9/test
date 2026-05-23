param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workspace

if (-not (Test-Path -LiteralPath (Join-Path $workspace ".git"))) {
  throw "当前目录还不是 Git 仓库。请先执行 git init。"
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "update todo list " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

git add admin.html admin.css admin.js README.md start-local-admin.ps1 publish.ps1 docs
git commit -m $Message

$branch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($branch)) {
  throw "无法识别当前分支。"
}

$remoteName = git remote
if ([string]::IsNullOrWhiteSpace($remoteName)) {
  Write-Host "已完成本地提交。当前没有配置远端仓库，请稍后手动执行 git remote add origin <repo-url> 和 git push -u origin $branch"
  exit 0
}

git push
