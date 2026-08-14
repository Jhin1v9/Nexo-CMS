/**
 * Testes REAIS do @nexo/secrets (M4 §9: zero mocks de fs/db) — SQLite real em
 * tmpdir, chave mestra real em tmpdir, round-trip completo
 * store→use→rotate→revoke→delete, erros do contrato, audit sem valor e
 * verificação de que o plaintext NÃO aparece no arquivo .db.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStorage, type Storage } from '@nexo/storage';

import type { SecretAuditEvent, SecretStore } from '../src/index.js';
import { createSecretStore, masterKeyPath } from '../src/index.js';

const VALUE_V1 = 'pk-live-9f8e7d6c5b4a-valor-secreto-v1';
const VALUE_V2 = 'pk-live-1a2b3c4d5e6f-valor-secreto-v2';

let dbDir: string;
let nexoHome: string;
let storage: Storage;
let events: SecretAuditEvent[];
let store: SecretStore;

beforeEach(() => {
  dbDir = mkdtempSync(join(tmpdir(), 'nexo-secrets-db-'));
  nexoHome = mkdtempSync(join(tmpdir(), 'nexo-secrets-home-'));
  const r = createStorage(dbDir);
  if (!r.ok) throw new Error(r.error.message);
  storage = r.value;
  events = [];
  store = createSecretStore({
    storage,
    nexoHome,
    emitAudit: (e) => events.push(e),
  });
});

afterEach(() => {
  storage.close();
  rmSync(dbDir, { recursive: true, force: true });
  rmSync(nexoHome, { recursive: true, force: true });
});

function storeOk(value = VALUE_V1, name = 'provider-key') {
  const r = store.storeSecret({ name, value, scope: 'WORKSPACE' });
  if (!r.ok) throw new Error(`store falhou: ${r.error.message}`);
  return r.value;
}

describe('secret store — round-trip real (D25)', () => {
  it('store → use → rotate → use → revoke → delete', () => {
    const meta = storeOk();
    expect(meta.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(meta.name).toBe('provider-key');
    expect(meta.scope).toBe('WORKSPACE');
    expect(meta.createdAt).toBeTruthy();
    // metadata NUNCA expõe valor nem material cifrado
    expect(JSON.stringify(meta)).not.toContain(VALUE_V1);
    expect(meta).not.toHaveProperty('ciphertext');
    expect(meta).not.toHaveProperty('value');

    // use retorna plaintext em memória
    const used = store.useSecret(meta.id);
    expect(used.ok).toBe(true);
    if (used.ok) expect(used.value).toBe(VALUE_V1);

    // rotate: novo valor passa a valer; o antigo não resolve mais
    const rotated = store.rotateSecret(meta.id, VALUE_V2);
    expect(rotated.ok).toBe(true);
    if (rotated.ok) {
      expect(rotated.value.updatedAt >= meta.updatedAt).toBe(true);
    }
    const used2 = store.useSecret(meta.id);
    expect(used2.ok).toBe(true);
    if (used2.ok) {
      expect(used2.value).toBe(VALUE_V2);
      expect(used2.value).not.toBe(VALUE_V1);
    }

    // revoke → usos futuros falham FORBIDDEN
    const revoked = store.revokeSecret(meta.id);
    expect(revoked.ok).toBe(true);
    if (revoked.ok) expect(revoked.value.revokedAt).not.toBeNull();
    const usedAfterRevoke = store.useSecret(meta.id);
    expect(usedAfterRevoke.ok).toBe(false);
    if (!usedAfterRevoke.ok) expect(usedAfterRevoke.error.code).toBe('FORBIDDEN');

    // delete (agora permitido) → NOT_FOUND depois
    const deleted = store.deleteSecret(meta.id);
    expect(deleted.ok).toBe(true);
    const gone = store.getSecretMetadata(meta.id);
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.error.code).toBe('NOT_FOUND');
  });

  it('segunda instância do store (mesmo NEXO_HOME + DB) decifra — chave reutilizada', () => {
    const meta = storeOk();
    const store2 = createSecretStore({ storage, nexoHome });
    const used = store2.useSecret(meta.id);
    expect(used.ok).toBe(true);
    if (used.ok) expect(used.value).toBe(VALUE_V1);
  });
});

describe('secret store — erros do contrato (§2.1)', () => {
  it('use/metadata/rotate/revoke/delete de id inexistente → NOT_FOUND', () => {
    for (const r of [
      store.useSecret('ghost'),
      store.getSecretMetadata('ghost'),
      store.rotateSecret('ghost', 'x'),
      store.revokeSecret('ghost'),
      store.deleteSecret('ghost'),
    ]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('NOT_FOUND');
    }
  });

  it('revoked → FORBIDDEN em useSecret e rotateSecret', () => {
    const meta = storeOk();
    store.revokeSecret(meta.id);
    const used = store.useSecret(meta.id);
    expect(used.ok).toBe(false);
    if (!used.ok) expect(used.error.code).toBe('FORBIDDEN');
    const rotated = store.rotateSecret(meta.id, VALUE_V2);
    expect(rotated.ok).toBe(false);
    if (!rotated.ok) expect(rotated.error.code).toBe('FORBIDDEN');
  });

  it('delete sem revoke → CONFLICT; após revoke → SUCCESS', () => {
    const meta = storeOk();
    const blocked = store.deleteSecret(meta.id);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('CONFLICT');
    // registro continua intacto e utilizável
    const used = store.useSecret(meta.id);
    expect(used.ok).toBe(true);
    store.revokeSecret(meta.id);
    expect(store.deleteSecret(meta.id).ok).toBe(true);
  });

  it('inputs inválidos → INVALID_INPUT e NADA persistido', () => {
    const cases: Array<Parameters<SecretStore['storeSecret']>[0]> = [
      { name: '', value: VALUE_V1, scope: 'WORKSPACE' },
      { name: '  ', value: VALUE_V1, scope: 'WORKSPACE' },
      { name: 'k', value: '', scope: 'WORKSPACE' },
      { name: 'k', value: VALUE_V1, scope: 'PROJECT' }, // sem projectId
      { name: 'k', value: VALUE_V1, scope: 'WORKSPACE', projectId: 'p-1' },
    ];
    for (const input of cases) {
      const r = store.storeSecret(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_INPUT');
    }
    expect(store.listSecrets()).toHaveLength(0);
  });

  it('scope PROJECT com projectId funciona e lista por projeto (+WORKSPACE)', () => {
    const ws = storeOk();
    const proj = store.storeSecret({
      name: 'proj-key',
      value: VALUE_V2,
      scope: 'PROJECT',
      projectId: 'p-1',
      providerId: 'prov-1',
    });
    expect(proj.ok).toBe(true);
    const all = store.listSecrets();
    expect(all).toHaveLength(2);
    const p1 = store.listSecrets({ projectId: 'p-1' });
    expect(p1.map((s) => s.id).sort()).toEqual([ws.id, proj.ok ? proj.value.id : ''].sort());
    const p2 = store.listSecrets({ projectId: 'p-2' });
    expect(p2.map((s) => s.id)).toEqual([ws.id]);
  });
});

describe('secret store — proteção do material (RT&SEC §69-70)', () => {
  it('plaintext NÃO aparece em nenhum arquivo do dataDir (grep raw no .db)', () => {
    storeOk();
    storeOk(VALUE_V2, 'provider-key-2');
    storage.db.pragma('wal_checkpoint(TRUNCATE)');
    for (const file of readdirSync(dbDir)) {
      const raw = readFileSync(join(dbDir, file));
      const asLatin1 = raw.toString('latin1');
      expect(asLatin1).not.toContain(VALUE_V1);
      expect(asLatin1).not.toContain(VALUE_V2);
      expect(asLatin1).not.toContain('valor-secreto');
    }
    // e o row no SQLite tem ciphertext != plaintext
    const rows = storage.db.prepare('SELECT ciphertext, iv, auth_tag FROM secrets').all() as Array<{
      ciphertext: string;
      iv: string;
      auth_tag: string;
    }>;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.ciphertext).not.toContain(VALUE_V1);
      expect(row.iv).not.toBe('');
      expect(row.auth_tag).not.toBe('');
    }
  });

  it('master.key: 32 bytes, modo 0600; dir keys modo 0700', () => {
    storeOk(); // força geração da chave
    const keyPath = masterKeyPath(nexoHome);
    const keyStat = statSync(keyPath);
    expect(keyStat.size).toBe(32);
    expect(keyStat.mode & 0o777).toBe(0o600);
    const dirStat = statSync(join(nexoHome, 'keys'));
    expect(dirStat.mode & 0o777).toBe(0o700);
    const key = readFileSync(keyPath);
    expect(key).toHaveLength(32);
  });
});

describe('secret store — audit hooks (M4 §9: NUNCA com valor)', () => {
  it('emite store/access-use/rotate/revoke/delete sem valor nem material', () => {
    const meta = storeOk();
    store.useSecret(meta.id);
    store.rotateSecret(meta.id, VALUE_V2);
    store.revokeSecret(meta.id);
    store.deleteSecret(meta.id);

    const whats = events.map((e) => e.what);
    expect(whats).toEqual([
      'secret.store',
      'secret.access-use',
      'secret.rotate',
      'secret.revoke',
      'secret.delete',
    ]);
    for (const e of events) {
      expect(e.result).toBe('SUCCESS');
      expect(e.resource).toBe(meta.id);
      expect(e.at).toBeTruthy();
    }
    const auditBlob = JSON.stringify(events);
    expect(auditBlob).not.toContain(VALUE_V1);
    expect(auditBlob).not.toContain(VALUE_V2);
    expect(auditBlob).not.toContain('ciphertext');
  });

  it('falhas de domínio emitem FAILED com errorCode (auditoria não mente, Inv. 26)', () => {
    const meta = storeOk();
    events.length = 0;
    store.revokeSecret(meta.id);
    store.useSecret(meta.id); // FORBIDDEN
    store.deleteSecret('ghost'); // NOT_FOUND
    const failed = events.filter((e) => e.result === 'FAILED');
    expect(failed.map((e) => e.details?.['errorCode'])).toEqual(['FORBIDDEN', 'NOT_FOUND']);
    expect(JSON.stringify(events)).not.toContain(VALUE_V1);
  });
});
