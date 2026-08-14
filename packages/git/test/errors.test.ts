import { afterEach, describe, expect, it } from 'vitest';

import { classifyGitError, createGitClient, gitErrorToNexo } from '../src/index.js';
import { cleanup, createTempRepo, makeExecutor } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

describe('classifyGitError (doc 10 §62) — unitário puro', () => {
  const cases: Array<[string, string]> = [
    ['fatal: not a git repository (or any of the parent directories): .git', 'RepositoryNotFound'],
    ['fatal: Authentication failed for https://example.com/r.git', 'AuthenticationFailed'],
    ['fatal: could not read Username for https://github.com: terminal prompts disabled', 'AuthenticationFailed'],
    ['git@example.com: Permission denied (publickey).', 'PermissionDenied'],
    [' ! [rejected] main -> main (non-fast-forward)', 'NonFastForward'],
    ['hint: Updates were rejected because the tip of your current branch is behind', 'NonFastForward'],
    ['error: failed to push some refs to /tmp/bare', 'NonFastForward'],
    ['To /tmp/bare ! [remote rejected] main (fetch first)', 'NonFastForward'],
    ['fatal: The current branch x has no upstream branch.', 'NoTrackingBranch'],
    ["error: Your local changes to the following files would be overwritten by checkout:", 'WorkingTreeDirty'],
    ['Please commit your changes or stash them before you merge.', 'WorkingTreeDirty'],
    ['CONFLICT (content): Merge conflict in shared.txt', 'MergeConflict'],
    ['Automatic merge failed; fix conflicts and then commit the result.', 'MergeConflict'],
    ["error: the branch 'x' is not fully merged", 'MergeConflict'],
    ["error: branch 'ghost' not found", 'BranchNotFound'],
    ["fatal: 'ghost-remote' does not appear to be a git repository", 'RemoteNotFound'],
    ["fatal: invalid reference: '..bad'", 'InvalidReference'],
    ["fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.", 'InvalidReference'],
    ['error: gpg failed to sign the data', 'UnknownGitError'],
    ['', 'UnknownGitError'],
  ];

  for (const [stderr, expected] of cases) {
    it(`'${stderr.slice(0, 48)}...' -> ${expected}`, () => {
      expect(classifyGitError(stderr)).toBe(expected);
    });
  }
});

describe('gitErrorToNexo (doc 10 §63) — mapeamento + details machine-readable', () => {
  it('mapeamentos de code por kind', () => {
    expect(gitErrorToNexo('RepositoryNotFound').code).toBe('NOT_FOUND');
    expect(gitErrorToNexo('BranchNotFound').code).toBe('NOT_FOUND');
    expect(gitErrorToNexo('RemoteNotFound').code).toBe('NOT_FOUND');
    expect(gitErrorToNexo('WorkingTreeDirty').code).toBe('CONFLICT');
    expect(gitErrorToNexo('MergeConflict').code).toBe('CONFLICT');
    expect(gitErrorToNexo('NonFastForward').code).toBe('CONFLICT');
    expect(gitErrorToNexo('AuthenticationFailed').code).toBe('FORBIDDEN');
    expect(gitErrorToNexo('PermissionDenied').code).toBe('FORBIDDEN');
    expect(gitErrorToNexo('InvalidReference').code).toBe('INVALID_INPUT');
    expect(gitErrorToNexo('HookFailed').code).toBe('INTERNAL');
    expect(gitErrorToNexo('UnknownGitError').code).toBe('INTERNAL');
  });

  it('details.gitError sempre presente; stderr redigido e truncado', () => {
    const longSecret = `fatal: https://u:${'s'.repeat(900)}@h/x failed`;
    const e = gitErrorToNexo('AuthenticationFailed', { stderr: longSecret, operationId: 'op-1' });
    expect(e.details?.['gitError']).toBe('AuthenticationFailed');
    expect(e.operationId).toBe('op-1');
    const stderr = String(e.details?.['stderr']);
    expect(stderr.length).toBeLessThanOrEqual(500);
    expect(stderr).not.toContain('s'.repeat(100));
    expect(stderr).toContain('https://***@h');
  });

  it('NonFastForward carrega nextAction para o agente (doc 10 §63)', () => {
    const e = gitErrorToNexo('NonFastForward', { stderr: 'non-fast-forward' });
    expect(e.details?.['nextAction']).toBe('fetch-and-pull');
  });
});

describe('gitVersion (doc 10 §82 passo 5)', () => {
  it('git CLI real presente no ambiente -> versão real', async () => {
    const dir = createTempRepo();
    dirs.push(dir);
    const client = createGitClient({ executor: makeExecutor(dir) });
    const r = await client.gitVersion();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatch(/^git version \d+\.\d+\.\d+/);
  });
});
