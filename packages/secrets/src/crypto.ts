/**
 * Cripto do secret store (D25 — RT&SEC §69-70): AES-256-GCM via node:crypto
 * (zero deps novas). Chave mestra de 32 bytes em `${NEXO_HOME}/keys/master.key`:
 * gerada na 1ª execução com randomBytes, arquivo modo 0600, diretório 0700.
 * A chave NUNCA vai para o DB nem para logs/audit. KMS/HSM = COMMERCIAL-FUTURE.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { err, ok, type Result } from '@nexo/shared';

import { secretError } from './errors.js';

export const KEYS_DIRNAME = 'keys';
export const MASTER_KEY_FILENAME = 'master.key';
export const MASTER_KEY_BYTES = 32; // AES-256
export const GCM_IV_BYTES = 12;
export const GCM_AUTH_TAG_BYTES = 16;

/** Caminho da chave mestra para um NEXO_HOME (exposto para testes/verificação). */
export function masterKeyPath(nexoHome: string): string {
  return join(nexoHome, KEYS_DIRNAME, MASTER_KEY_FILENAME);
}

/**
 * Carrega ou gera a chave mestra (D25). Geração na 1ª execução: dir 0700,
 * arquivo 0600 (writeFileSync mode + chmodSync para forçar mesmo com umask
 * permissiva). Em arquivo pré-existente, reforça 0600 best-effort e exige
 * exatamente 32 bytes — tamanho errado = store indisponível (fail closed).
 */
export function loadMasterKey(nexoHome: string): Result<Buffer> {
  const keysDir = join(nexoHome, KEYS_DIRNAME);
  const keyPath = join(keysDir, MASTER_KEY_FILENAME);
  try {
    if (existsSync(keyPath)) {
      const key = readFileSync(keyPath);
      try {
        chmodSync(keyPath, 0o600);
      } catch {
        // best-effort: leitura já funcionou; falha de chmod não bloqueia
      }
      if (key.length !== MASTER_KEY_BYTES) {
        return err(
          secretError(
            'SecretStoreUnavailable',
            `master.key tem ${key.length} bytes; esperado ${MASTER_KEY_BYTES} (AES-256)`,
            { resource: keyPath },
          ),
        );
      }
      return ok(key);
    }
    mkdirSync(keysDir, { recursive: true, mode: 0o700 });
    try {
      chmodSync(keysDir, 0o700);
    } catch {
      // best-effort em FS que não honra chmod
    }
    const key = randomBytes(MASTER_KEY_BYTES);
    writeFileSync(keyPath, key, { mode: 0o600, flag: 'wx' });
    chmodSync(keyPath, 0o600);
    return ok(key);
  } catch (cause) {
    return err(
      secretError('SecretStoreUnavailable', 'nao foi possivel carregar/gerar a chave mestra', {
        resource: keyPath,
        details: { cause: cause instanceof Error ? cause.message : String(cause) },
      }),
    );
  }
}

export interface EncryptedSecret {
  ciphertext: string; // base64
  iv: string; // base64, 12 bytes
  authTag: string; // base64, 16 bytes
}

/** Cifra plaintext UTF-8 com AES-256-GCM (iv aleatório por operação). */
export function encryptSecret(key: Buffer, plaintext: string): EncryptedSecret {
  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: GCM_AUTH_TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

/**
 * Decifra para plaintext em memória. authTag inválida/corrompida => erro
 * estruturado (nunca throw, nunca loga o valor nem o material).
 */
export function decryptSecret(key: Buffer, encrypted: EncryptedSecret): Result<string> {
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(encrypted.iv, 'base64'),
      { authTagLength: GCM_AUTH_TAG_BYTES },
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return ok(plaintext.toString('utf8'));
  } catch {
    return err(
      secretError(
        'SecretStoreUnavailable',
        'falha ao decifrar o secret (material corrompido ou chave incorreta)',
      ),
    );
  }
}
