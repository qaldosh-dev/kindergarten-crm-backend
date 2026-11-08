# Kindergarten Management & Billing

Java 21 / Spring Boot backend and React frontend for attendance and parent billing in a private kindergarten.

Business requirements are in docs/specification.md. Application implementation has not started.

## CLI agent coordination

The coordinator dispatches tasks to Codex CLI and Antigravity CLI in separate Git worktrees. Responses, diagnostics and per-task statuses are saved under .agent-runs/. The coordinator inspects diffs and runs checks before integrating changes.

Requirements: Windows PowerShell, Node.js, Git, authenticated codex.cmd and agy CLI on PATH. Existing CLI settings and cached authentication are used. Permission bypass flags are not used. Headless tasks may require an execution approval from the parent Codex session. Authentication prompts require the account owner's participation.

After the initial commit, create workers from the repository directory:

```powershell
git worktree add -b agent/backend ../kindergarten-backend main
git worktree add -b agent/frontend ../kindergarten-frontend main
node tools/agents.mjs tasks/smoke.json
```

Both tasks run concurrently. The command waits for completion, writes logs and a summary, and returns nonzero if a task fails or times out. The default timeout is 15 minutes per task, configurable with AGENT_TIMEOUT_SECONDS. Stop the launcher with Ctrl+C to stop its workers. On Windows, only process trees started by this launcher are terminated.

Tasks specify a unique id, provider, worktree, expected branch and a UTF-8 prompt file. One active task per worktree is enforced with lock files. The worktree must be a registered worktree of this repository. Branches and task prompts are checked before any worker starts. If a process crashes and leaves a lock, inspect its recorded process and logs before removing the stale lock.

Codex runs with workspace-write sandbox. Antigravity runs in auto mode with its terminal sandbox. Tool permissions remain subject to CLI policy. Antigravity can report SUCCESS despite denied tool actions, so inspect stderr and verify files. Successful turns receive review_required status, not an assertion that the feature works.

The smoke tasks only write diagnostic connection reports. They do not implement application features. Future rounds replace the task manifest and prompts with concrete implementation tasks. Backend and frontend agree on API contracts before development. Existing workers receive merged foundation changes between rounds, when their work is committed and the worktrees are clean.

