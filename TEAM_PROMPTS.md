# 团队启动提示词

## 项目负责人启动提示词

```text
我的角色：项目负责人。
我的环境：macOS + zsh。
本次任务：继续完成当前里程碑。

请先阅读 AGENTS.md、TRAE_MVP_PROMPT.md、TEAM_PLAN.md 和 TASKS.md，然后根据我的角色自动确定负责模块和分支。检查 Git 根目录、origin、当前分支和工作区状态；当前分支不符合约定时，切换到 TEAM_PLAN.md 指定的分支。

按最小可验证步骤工作和提交。只修改本次任务文件；共享接口变更单独提交。完成后运行相关检查和 npm run build，更新 TASKS.md，并报告提交、验证结果和未完成项。
```

## 成员冷启动模板

```text
我的角色：[成员 A / 成员 B / 成员 C]
我的环境：[Windows 11 + PowerShell / Windows + Git Bash / Windows + WSL / 其他]
本次任务：[本次要完成的小任务；不清楚可写“从当前任务板领取下一项”]
仓库：https://github.com/YanMinLiOfficial/Hackthon

请先冷启动，不要直接写代码：

1. 如果本机没有仓库，在我指定的父目录克隆仓库并进入 Hackthon；如果已经存在，核对 origin 和 git status。
2. 已有仓库存在未提交修改时，停止拉取并告诉我具体文件；工作区干净时切换 main 并执行 git pull --ff-only origin main。
3. 阅读 AGENTS.md、TRAE_MVP_PROMPT.md、TEAM_PLAN.md 和 TASKS.md。
4. 根据我的成员角色自动确定负责模块和 feature 分支，不要再询问我模块或分支。分支不存在时从最新 main 创建；已存在时切换并合并最新 origin/main，不重写共享历史。
5. 开发前向我复述角色、环境、自动确定的模块、分支和本次最小任务；如果角色或环境没有填写，必须先询问并暂停修改。

开发时只修改自己负责的模块。需要修改共享类型、状态、路由、依赖或全局样式时，先询问项目负责人。一个提交只完成一个可解释、可验证、可回退的目的；每次提交前检查 git diff 和 git status。完成后运行相关检查和 npm run build，更新 TASKS.md，并列出提交、验证结果和需要负责人集成的接口。默认不推送、不创建 PR，等我确认。
```
