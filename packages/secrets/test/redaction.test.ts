/**
 * Testes REAIS da redaction (RT&SEC §28-29; M4 §9): cada padrão conhecido é
 * redigido para '***', valores reais do store (decifrados só em memória) são
 * redigidos, e extraSecrets explícitos também. Sem mocks — store real.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStorage, type Storage } from '@nexo/storage';

import type { SecretStore } from '../src/index.js';
import {
  createSecretStore,
  redactPatterns,
  redactText,
  SECRET_PATTERNS,
} from '../src/index.js';

const STORE_VALUE = 'minha-chave-super-secreta-do-store-0123456789';

let dir: string;
let home: string;
let storage: Storage;
let store: SecretStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nexo-redact-db-'));
  home = mkdtempSync(join(tmpdir(), 'nexo-redact-home-'));
  const r = createStorage(dir);
  if (!r.ok) throw new Error(r.error.message);
  storage = r.value;
  store = createSecretStore({ storage, nexoHome: home });
  const stored = store.storeSecret({
    name: 'store-key',
    value: STORE_VALUE,
    scope: 'WORKSPACE',
  });
  if (!stored.ok) throw new Error('store falhou no setup');
});

afterEach(() => {
  storage.close();
  rmSync(dir, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

describe('SECRET_PATTERNS — cada padrão conhecido é redigido', () => {
  const cases: Array<{ name: string; text: string; mustVanish: string }> = [
    { name: 'openai-api-key', text: 'key = sk-a1b2c3d4e5f6a7b8c9d0e1f2 ok', mustVanish: 'sk-a1b2c3d4e5f6a7b8c9d0e1f2' },
    { name: 'openai-api-key (sk-proj)', text: 'sk-proj-AbC123_xYz-4567890abcd', mustVanish: 'sk-proj-AbC123_xYz-4567890abcd' },
    { name: 'github-token-classic', text: 'token: ghp_abcdefghijABCDEFGHIJ0123456789', mustVanish: 'ghp_abcdefghijABCDEFGHIJ0123456789' },
    { name: 'github-pat-fine-grained', text: 'github_pat_11ABCDEFG0_ijklmnopqrstuvwxyz012345', mustVanish: 'github_pat_11ABCDEFG0_ijklmnopqrstuvwxyz012345' },
    { name: 'bearer-token', text: 'Authorization: Bearer eyJhbGciOiJ9.abc123-_def', mustVanish: 'Bearer eyJhbGciOiJ9.abc123-_def' },
    { name: 'api-key-param', text: 'https://x.test/call?api_key=AbC123xYz_456-789&foo=1', mustVanish: 'api_key=AbC123xYz_456-789' },
    { name: 'google-api-key', text: 'AIzaSyD4iE8example-key-0123456789abcd', mustVanish: 'AIzaSyD4iE8example-key-0123456789abcd' },
    { name: 'slack-token', text: 'xoxb-123456789012-abcdefghijkl', mustVanish: 'xoxb-123456789012-abcdefghijkl' },
    {
      name: 'pem-private-key',
      text: [
        'antes',
        '-----BEGIN RSA PRIVATE KEY-----',
        'MIIEpAIBAAKCAQEA7dbKt+example',
        'mais-linhas-do-bloco==',
        '-----END RSA PRIVATE KEY-----',
        'depois',
      ].join('\n'),
      mustVanish: 'MIIEpAIBAAKCAQEA7dbKt+example',
    },
  ];

  it('cada caso é coberto por um pattern nomeado e vira ***', () => {
    const names = new Set(SECRET_PATTERNS.map((p) => p.name));
    for (const c of cases) {
      const base = c.name.replace(/ \(.*\)$/, '');
      expect(names.has(base), `pattern ausente: ${base}`).toBe(true);
      const out = redactPatterns(c.text);
      expect(out, `pattern ${c.name} nao redigiu`).not.toContain(c.mustVanish);
      expect(out).toContain('***');
    }
  });

  it('texto sem secrets permanece intacto', () => {
    const clean = 'const x = 42; // comentario comum sobre API keys em geral';
    expect(redactPatterns(clean)).toBe(clean);
  });
});

describe('redactSecrets — valores reais do store + extraSecrets', () => {
  it('valor atual do store é redigido (resolvido em memória)', () => {
    const text = `falha ao chamar provider com ${STORE_VALUE} no header`;
    const out = store.redactSecrets(text);
    expect(out).not.toContain(STORE_VALUE);
    expect(out).toBe('falha ao chamar provider com *** no header');
  });

  it('valor revogado continua sendo redigido (revogado ainda vaza se impresso)', () => {
    const listed = store.listSecrets();
    const id = listed[0]?.id ?? '';
    store.revokeSecret(id);
    const out = store.redactSecrets(`token=${STORE_VALUE}`);
    expect(out).not.toContain(STORE_VALUE);
    expect(out).toBe('token=***');
  });

  it('valor rotacionado: o NOVO valor passa a ser redigido', () => {
    const listed = store.listSecrets();
    const id = listed[0]?.id ?? '';
    const NEW_VALUE = 'novo-valor-rotacionado-987654321';
    store.rotateSecret(id, NEW_VALUE);
    const out = store.redactSecrets(`old=${STORE_VALUE} new=${NEW_VALUE}`);
    expect(out).toContain('***');
    expect(out).not.toContain(NEW_VALUE);
    // o valor antigo nao esta mais no store — permanece visivel (nao inventar)
    expect(out).toContain(STORE_VALUE);
  });

  it('extraSecrets explícitos são redigidos mesmo fora do store', () => {
    const extra = 'valor-extra-fora-do-store-xyz';
    const out = store.redactSecrets(`vazou ${extra} aqui`, [extra]);
    expect(out).not.toContain(extra);
    expect(out).toBe('vazou *** aqui');
  });

  it('combina padrão conhecido + valor do store no mesmo texto', () => {
    const text = `Authorization: Bearer topsecretBearer123 e depois ${STORE_VALUE}`;
    const out = store.redactSecrets(text);
    expect(out).not.toContain('topsecretBearer123');
    expect(out).not.toContain(STORE_VALUE);
  });

  it('redactText (puro, sem store) cobre padrões + extraSecrets, não o store', () => {
    const out = redactText(`sk-a1b2c3d4e5f6a7b8c9d0e1f2 e ${STORE_VALUE}`, []);
    expect(out).not.toContain('sk-a1b2c3d4e5f6a7b8c9d0e1f2');
    // sem acesso ao store, o valor concreto permanece — comportamento honesto
    expect(out).toContain(STORE_VALUE);
  });
});
