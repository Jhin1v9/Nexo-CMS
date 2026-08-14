import { afterEach, describe, expect, it } from 'vitest';

import { redactText, redactUrl } from '../src/index.js';
import { cleanup, createTempRepo, git, makeExecutor } from './helpers.js';

const dirs: string[] = [];
afterEach(() => cleanup(...dirs.splice(0)));

describe('redação de credenciais (doc 10 §28/§33/§61)', () => {
  it('redactUrl: userinfo https -> ***', () => {
    expect(redactUrl('https://user:secrettoken@example.com/repo.git')).toBe('https://***@example.com/repo.git');
    expect(redactUrl('https://oauth2:ghp_abc123@github.com/org/repo.git')).toBe('https://***@github.com/org/repo.git');
  });

  it('redactUrl: ssh://user@host e scp-like user@host:path redigidos', () => {
    expect(redactUrl('ssh://git@example.com/repo.git')).toBe('ssh://***@example.com/repo.git');
    expect(redactUrl('git@example.com:org/repo.git')).toBe('***@example.com:org/repo.git');
  });

  it('redactUrl: URLs sem credencial e paths locais passam inalterados', () => {
    expect(redactUrl('https://example.com/repo.git')).toBe('https://example.com/repo.git');
    expect(redactUrl('/tmp/bare-repo')).toBe('/tmp/bare-repo');
    expect(redactUrl('file:///tmp/bare-repo')).toBe('file:///tmp/bare-repo');
  });

  it('redactText: credenciais embutidas em stderr/texto são redigidas', () => {
    const text = "fatal: unable to access 'https://user:secrettoken@example.com/repo.git/': auth failed";
    const out = redactText(text);
    expect(out).not.toContain('secrettoken');
    expect(out).toContain('https://***@example.com');
  });

  it('remotes(): URL com credencial sai SEMPRE redigida do service (doc 10 §61)', async () => {
    const dir = createTempRepo();
    dirs.push(dir);
    git(dir, ['remote', 'add', 'origin', 'https://user:secrettoken@example.com/repo.git']);

    // remotes() vive no GitClient (mesma fronteira do package; redação aplicada
    // antes de qualquer URL sair do @nexo/git).
    const { createGitClient } = await import('../src/index.js');
    const client = createGitClient({ executor: makeExecutor(dir) });
    const r = await client.remotes('.');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const origin = r.value.find((x) => x.name === 'origin');
    expect(origin).toBeDefined();
    expect(origin!.fetchUrl).toBe('https://***@example.com/repo.git');
    expect(origin!.pushUrl).toBe('https://***@example.com/repo.git');
    expect(JSON.stringify(r.value)).not.toContain('secrettoken');
  });
});
