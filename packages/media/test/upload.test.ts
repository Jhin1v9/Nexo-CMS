/**
 * Upload (08§44/§45/§52/§53/§67) contra fixture REAL em tmpdir.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createMediaService } from '../src/index.js';

import {
  b64,
  cleanupFixture,
  createFixtureProject,
  makeCtx,
  makeJpeg,
  makePng,
  makeSvg,
  type Fixture,
} from './helpers.js';

let fixture: Fixture;

afterEach(() => {
  cleanupFixture(fixture);
});

describe('media.upload (08§44: Select → Validate → Security → Process → Store → Index → Register)', () => {
  it('upload feliz: arquivo real gravado no disco, verificado e registrado', async () => {
    fixture = createFixtureProject();
    const png = makePng(2, 3);
    const r = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'banner.png',
      contentBase64: b64(png),
      targetPath: 'src/assets',
      altText: 'banner principal',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verified).toBe(true);
    expect(r.value.storedPath).toBe('src/assets/banner.png');
    // existe de verdade no disco com o conteúdo idêntico (08§44)
    const abs = path.join(fixture.dir, 'src/assets', 'banner.png');
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs).equals(png)).toBe(true);
    // registrado (Register) com metadata 08§82 e dimensões reais
    const listed = await fixture.service.list(makeCtx(fixture.projectId), { projectId: fixture.projectId });
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      const asset = listed.value.find((a) => a.id === r.value.asset.id);
      expect(asset?.metadata.mime).toBe('image/png');
      expect(asset?.metadata.size).toBe(png.length);
      expect(asset?.metadata.altText).toBe('banner principal');
      expect(asset?.dimensions).toEqual({ width: 2, height: 3 });
      expect(asset?.source).toEqual({ origin: 'UploadedFile', path: 'src/assets/banner.png' });
      // recém-upload sem referências; scan completo => Unused (honesto), nunca Unknown->Unused
      expect(asset?.usage.state).toBe('Unused');
    }
  });

  it('MIME falso: arquivo .png com conteúdo JPEG -> detectado e rejeitado (08§45)', async () => {
    fixture = createFixtureProject();
    const r = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'fake.png',
      contentBase64: b64(makeJpeg()),
      targetPath: 'src/assets',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INVALID_INPUT');
      expect(r.error.details?.['mediaError']).toBe('MimeExtensionMismatch');
      expect(r.error.details?.['detectedMime']).toBe('image/jpeg');
    }
    expect(existsSync(path.join(fixture.dir, 'src/assets', 'fake.png'))).toBe(false);
  });

  it('SVG com <script -> rejeitado com diagnóstico (08§67)', async () => {
    fixture = createFixtureProject();
    const evil = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');
    const r = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'evil.svg',
      contentBase64: b64(evil),
      targetPath: 'public',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('FORBIDDEN');
      expect(r.error.details?.['mediaError']).toBe('UnsafeSvgActiveContent');
      const issues = r.error.details?.['issues'] as Array<{ kind: string }>;
      expect(issues.some((i) => i.kind === 'script')).toBe(true);
    }
    expect(existsSync(path.join(fixture.dir, 'public', 'evil.svg'))).toBe(false);
  });

  it('SVG com onload= -> rejeitado; SVG inocuo -> aceito', async () => {
    fixture = createFixtureProject();
    const onload = Buffer.from('<svg onload="run()"></svg>', 'utf8');
    const bad = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'bad.svg',
      contentBase64: b64(onload),
      targetPath: 'public',
    });
    expect(bad.ok).toBe(false);
    const good = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'good.svg',
      contentBase64: b64(makeSvg()),
      targetPath: 'public',
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.value.asset.type).toBe('SVG');
  });

  it('sem targetPath com dois diretórios de assets -> AmbiguousAssetDirectory (08§53)', async () => {
    fixture = createFixtureProject();
    const r = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'photo.png',
      contentBase64: b64(makePng()),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.details?.['mediaError']).toBe('AmbiguousAssetDirectory');
      expect(r.error.details?.['nextAction']).toBe('provide-explicit-targetPath');
      expect(r.error.details?.['candidates']).toEqual(['public', 'src/assets']);
    }
  });

  it('sem targetPath e sem diretório de assets -> NoAssetDirectoryDetected (nunca assumir /public)', async () => {
    fixture = createFixtureProject();
    // projeto minimalista: sem public/, sem src/assets
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const bare = mkdtempSync(path.join(tmpdir(), 'nexo-media-bare-'));
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(bare, 'package.json'), '{}');
    const now = new Date().toISOString();
    fixture.storage.repos.projects.insert({
      id: 'bare-project',
      name: 'bare',
      rootPath: bare,
      fingerprint: 'fp-bare',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
    const r = await fixture.service.upload(makeCtx('bare-project'), {
      projectId: 'bare-project',
      fileName: 'photo.png',
      contentBase64: b64(makePng()),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.details?.['mediaError']).toBe('NoAssetDirectoryDetected');
  });

  it('path traversal (../) -> SCOPE_VIOLATION, nada escrito fora do root', async () => {
    fixture = createFixtureProject();
    const r = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'evil.png',
      contentBase64: b64(makePng()),
      targetPath: '../outside/evil.png',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('SCOPE_VIOLATION');
      expect(r.error.details?.['mediaError']).toBe('ScopeViolation');
    }
    expect(existsSync(path.join(fixture.dir, '..', 'outside'))).toBe(false);
  });

  it('tamanho acima do limite configurável -> FileTooLarge (08§45 Size)', async () => {
    fixture = createFixtureProject();
    const limited = createMediaService({ storage: fixture.storage, maxUploadBytes: 16 });
    const r = await limited.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'big.png',
      contentBase64: b64(makePng()),
      targetPath: 'src/assets',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.details?.['mediaError']).toBe('FileTooLarge');
  });

  it('colisão de nome -> sufixo determinístico -2 (08§52, nunca final-final-2)', async () => {
    fixture = createFixtureProject();
    const first = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'hero.png',
      contentBase64: b64(makePng()),
      targetPath: 'src/assets',
    });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.storedPath).toBe('src/assets/hero-2.png'); // hero.png já existe no fixture
    const second = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'hero.png',
      contentBase64: b64(makePng()),
      targetPath: 'src/assets',
    });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.storedPath).toBe('src/assets/hero-3.png');
  });

  it('conteúdo irreconhecível -> UnsupportedMediaType, nada no disco', async () => {
    fixture = createFixtureProject();
    const r = await fixture.service.upload(makeCtx(fixture.projectId), {
      projectId: fixture.projectId,
      fileName: 'mystery.png',
      contentBase64: Buffer.from([1, 2, 3, 4, 5]).toString('base64'),
      targetPath: 'src/assets',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('UNSUPPORTED');
      expect(r.error.details?.['mediaError']).toBe('UnsupportedMediaType');
    }
    expect(existsSync(path.join(fixture.dir, 'src/assets', 'mystery.png'))).toBe(false);
  });
});
