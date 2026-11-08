# Working agreements

Read docs/specification.md before implementation. The coordinator assigns small tasks through CLI and reviews actual files and checks before integration.

- Codex owns backend/. Antigravity owns frontend/. Tasks may explicitly assign other paths.
- Work in the assigned worktree and branch. Do not switch branches or change another worktree.
- Report required API/contract changes to the coordinator. Shared docs/openapi.yaml, compose.yaml, migrations shared across tasks and root configuration have one owner per task.
- Complete only the assigned task. Do not start other agents, change global settings, push, merge or delete unrelated files.
- Never use real child or parent data in tests or demo.
- Run checks relevant to the change. Report failures and blocked actions honestly.
- Finish with changed files, checks and unresolved issues. A successful CLI exit only means the turn ended. The coordinator verifies the deliverable.
- Leave changes in the assigned worktree for coordinator inspection. Commit only if the task explicitly requests it.

