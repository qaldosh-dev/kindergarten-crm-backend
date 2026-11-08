import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, open, unlink } from 'node:fs/promises';
import { createWriteStream, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerScript = path.join(repository, 'tools', 'run-worker.ps1');
const children = new Set();
const activeLocks = [];
let stopping = false;

function git(args, cwd = repository) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
}

function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  try {
    execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true, stdio: 'ignore',
    });
  } catch {
    // The child may have exited while taskkill was starting.
  }
}

process.on('SIGINT', () => {
  stopping = true;
  for (const child of children) stopChild(child);
});
process.on('SIGTERM', () => {
  stopping = true;
  for (const child of children) stopChild(child);
});

async function execute(task, runDirectory, timeoutSeconds) {
  const stdoutPath = path.join(runDirectory, `${task.id}.stdout.log`);
  const stderrPath = path.join(runDirectory, `${task.id}.stderr.log`);
  const stdout = createWriteStream(stdoutPath);
  const stderr = createWriteStream(stderrPath);
  let ioError;
  stdout.on('error', error => { ioError = error.message; });
  stderr.on('error', error => { ioError = error.message; });

  const child = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-File', workerScript,
    '-Provider', task.provider, '-Workspace', task.workspace, '-PromptFile', task.promptPath,
  ], { cwd: task.workspace, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child);
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    stopChild(child);
  }, timeoutSeconds * 1000);

  console.log(`Started ${task.id}, PID ${child.pid ?? 'unavailable'}`);
  const outcome = await new Promise(resolve => {
    let launchError;
    child.on('error', error => { launchError = error.message; });
    child.on('close', code => resolve({ exitCode: code, launchError }));
  });
  clearTimeout(timer);
  children.delete(child);
  await Promise.all([stdout, stderr].map(stream => new Promise(resolve => {
    if (stream.writableFinished || stream.destroyed) return resolve();
    stream.once('finish', resolve);
    stream.once('close', resolve);
  })));

  let status = 'review_required';
  let error = outcome.launchError ?? ioError;
  if (timedOut) status = 'timed_out';
  else if (stopping) status = 'interrupted';
  else if (outcome.exitCode !== 0 || error) status = 'failed';

  if (status === 'review_required' && task.provider === 'agy') {
    try {
      const response = JSON.parse((await readFile(stdoutPath, 'utf8')).replace(/^\uFEFF/, ''));
      if (response.status !== 'SUCCESS') {
        status = 'failed';
        error = JSON.stringify(response.error ?? response.status);
      }
    } catch (parseError) {
      status = 'failed';
      error = `Invalid Antigravity JSON response: ${parseError.message}`;
    }
  }
  const result = {
    id: task.id, provider: task.provider, workspace: task.workspace,
    branch: task.branch, status, ...outcome, error, stdoutPath, stderrPath,
  };
  await writeFile(path.join(runDirectory, `${task.id}.result.json`), JSON.stringify(result, null, 2));
  console.log(`${task.id}: ${status}`);
  return result;
}

async function main() {
  if (process.platform !== 'win32') throw new Error('This launcher targets Windows.');
  if (!process.argv[2]) throw new Error('Usage: node tools/agents.mjs tasks/round.json');
  const timeoutSeconds = Number(process.env.AGENT_TIMEOUT_SECONDS ?? 900);
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) throw new Error('Invalid timeout.');
  const manifest = JSON.parse(await readFile(path.resolve(repository, process.argv[2]), 'utf8'));
  if (!Array.isArray(manifest.tasks) || manifest.tasks.length === 0) throw new Error('No tasks.');
  const registered = git(['worktree', 'list', '--porcelain']).split('\n')
    .filter(line => line.startsWith('worktree '))
    .map(line => realpathSync(line.slice(9)).toLowerCase());
  const ids = new Set();
  const workspaces = new Set();
  const tasks = [];

  for (const task of manifest.tasks) {
    if (!/^[a-z0-9-]+$/.test(task.id) || ids.has(task.id)) throw new Error('Invalid/duplicate task id.');
    if (!['codex', 'agy'].includes(task.provider)) throw new Error('Unsupported provider.');
    const workspace = realpathSync(path.resolve(repository, task.worktree));
    const workspaceKey = workspace.toLowerCase();
    if (!registered.includes(workspaceKey) || workspaces.has(workspaceKey)) {
      throw new Error('Worktree must be registered and assigned only once per round.');
    }
    if (git(['branch', '--show-current'], workspace) !== task.branch || task.branch === 'main') {
      throw new Error(`Wrong worker branch: ${task.id}`);
    }
    const promptPath = path.resolve(repository, task.prompt);
    if (!(await readFile(promptPath, 'utf8')).trim()) throw new Error('Empty prompt.');
    ids.add(task.id);
    workspaces.add(workspaceKey);
    tasks.push({ ...task, workspace, promptPath });
  }

  const runsRoot = path.join(repository, '.agent-runs');
  const runDirectory = path.join(runsRoot, new Date().toISOString().replaceAll(':', '-'));
  await mkdir(runDirectory, { recursive: true });
  try {
    for (const task of tasks) {
      const lockPath = path.join(runsRoot, `${path.basename(task.workspace)}.lock`);
      const lock = await open(lockPath, 'wx');
      activeLocks.push({ lock, lockPath });
      await lock.writeFile(JSON.stringify({ coordinatorPid: process.pid, runDirectory, taskId: task.id }));
    }
    const outcomes = await Promise.allSettled(tasks.map(task => execute(task, runDirectory, timeoutSeconds)));
    const results = outcomes.map((outcome, index) => outcome.status === 'fulfilled'
      ? outcome.value
      : { id: tasks[index].id, status: 'failed', error: String(outcome.reason) });
    await writeFile(path.join(runDirectory, 'summary.json'), JSON.stringify(results, null, 2));
    console.log(`Reports: ${runDirectory}`);
    if (results.some(result => result.status !== 'review_required')) process.exitCode = 1;
  } finally {
    for (const child of children) stopChild(child);
    for (const { lock, lockPath } of activeLocks) {
      await lock.close();
      await unlink(lockPath);
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
