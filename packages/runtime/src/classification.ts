/**
 * Classificação M1 de comandos (SPEC.md §4) — tabela em módulo próprio, testada.
 * SAFE (read-only allowlist) | RESTRICTED (conhecido, com efeitos) |
 * DANGEROUS (destrutivo, exige grant) | BLOCKED (nunca executa sem grant explícito) |
 * UNKNOWN (fora da tabela — nunca promovido a SAFE).
 * Sem shell: args são literais; mesmo assim padrões de pipe/encadeamento são BLOCKED
 * por defesa em profundidade (SPEC §4: 'curl x | sh' -> BLOCKED).
 */

export type CommandClass = 'SAFE' | 'RESTRICTED' | 'DANGEROUS' | 'BLOCKED' | 'UNKNOWN';

/** Subcomandos git read-only (SPEC §4). */
const GIT_SAFE_SUBCOMMANDS: ReadonlySet<string> = new Set([
  'status',
  'diff',
  'log',
  'branch',
  'show',
  'rev-parse',
  'ls-files',
  'remote',
  'describe',
  'tag',
]);

/** Comandos read-only sempre SAFE (com args quaisquer). */
const SAFE_COMMANDS: ReadonlySet<string> = new Set([
  'ls',
  'cat',
  'pwd',
  'echo',
  'head',
  'tail',
  'wc',
  'grep',
  'find',
  'file',
  'which',
  'whoami',
  'uname',
  'date',
  'true',
  'false',
]);

/** Runtimes/PMs: SAFE apenas para `--version`/`-v`; demais usos RESTRICTED. */
const VERSION_ONLY_SAFE: ReadonlySet<string> = new Set(['node', 'npm', 'pnpm', 'yarn', 'bun', 'deno', 'python3', 'python', 'tsc']);

/** Comandos conhecidos com efeitos colaterais moderados -> RESTRICTED. */
const RESTRICTED_COMMANDS: ReadonlySet<string> = new Set([
  'mkdir',
  'touch',
  'cp',
  'mv',
  'ln',
  'tar',
  'zip',
  'unzip',
  'curl',
  'wget',
  'ssh',
  'scp',
  'docker',
  'docker-compose',
  'make',
  'sed',
  'awk',
  'xargs',
  'tee',
  'install',
]);

/** Comandos destrutivos/perigosos -> DANGEROUS (exigem grant explícito). */
const DANGEROUS_COMMANDS: ReadonlySet<string> = new Set([
  'rm',
  'rmdir',
  'sh',
  'bash',
  'zsh',
  'fish',
  'eval',
  'kill',
  'killall',
  'pkill',
  'chmod',
  'chown',
  'chgrp',
  'truncate',
  'shred',
  'fdisk',
  'mount',
  'umount',
  'useradd',
  'userdel',
  'passwd',
]);

/** Comandos que nunca executam sem grant explícito -> BLOCKED. */
const BLOCKED_COMMANDS: ReadonlySet<string> = new Set([
  'sudo',
  'su',
  'doas',
  'mkfs',
  'dd',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init',
  'systemctl',
  'service',
  'iptables',
  'fork',
]);

/** Alvos que tornam `rm -rf` catastrófico -> BLOCKED. */
const CATASTROPHIC_RM_TARGETS: ReadonlySet<string> = new Set([
  '/',
  '/*',
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/home',
  '/lib',
  '/proc',
  '/root',
  '/sbin',
  '/sys',
  '/usr',
  '/var',
  '~',
  '~/',
]);

function baseName(command: string): string {
  const normalized = command.replaceAll('\\', '/');
  const base = normalized.slice(normalized.lastIndexOf('/') + 1);
  return base.toLowerCase();
}

/** `curl|wget ... | sh|bash` (ou `|sh` colado) -> BLOCKED. */
function isPipeToShell(args: readonly string[]): boolean {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '|' || a === '||' || a === '|&') {
      const next = args[i + 1];
      if (next !== undefined && ['sh', 'bash', 'zsh', 'fish'].includes(baseName(next))) return true;
    }
    if (/^\|+\s*(sh|bash|zsh|fish)\b/.test(a)) return true;
  }
  return false;
}

function hasRecursiveForce(args: readonly string[]): boolean {
  let recursive = false;
  let force = false;
  for (const a of args) {
    if (a === '--recursive') recursive = true;
    if (a === '--force') force = true;
    if (a.startsWith('-') && !a.startsWith('--')) {
      if (a.includes('r') || a.includes('R')) recursive = true;
      if (a.includes('f')) force = true;
    }
  }
  return recursive && force;
}

function classifyRm(args: readonly string[]): CommandClass {
  if (hasRecursiveForce(args)) {
    const targets = args.filter((a) => !a.startsWith('-'));
    if (targets.some((t) => CATASTROPHIC_RM_TARGETS.has(t) || t.endsWith('/*'))) {
      return 'BLOCKED';
    }
  }
  return 'DANGEROUS';
}

/**
 * Ações do `find` com efeitos colaterais (exec arbitrário / delete / escrita).
 * Wave 5 (FIX 1, classe irmã do scope escape via args): `find` está na
 * allowlist SAFE para LEITURA, mas `-exec`/`-delete` & cia executam comandos
 * ou apagam arquivos — nunca SAFE. Rebaixado para RESTRICTED (approval gate),
 * assim como `-fprint`/`-fprintf`/`-fls` (escrevem arquivo; o path-alvo já é
 * validado contra o root pelo arg-path guard do executor).
 */
const FIND_EFFECT_ACTIONS: ReadonlySet<string> = new Set([
  '-exec',
  '-execdir',
  '-ok',
  '-okdir',
  '-delete',
  '-fprint',
  '-fprintf',
  '-fls',
]);

function classifyFind(args: readonly string[]): CommandClass {
  return args.some((a) => FIND_EFFECT_ACTIONS.has(a)) ? 'RESTRICTED' : 'SAFE';
}

function classifyGit(args: readonly string[]): CommandClass {
  const sub = args.find((a) => !a.startsWith('-'));
  if (sub === undefined) return 'RESTRICTED'; // git puro (help etc.)
  if (sub === 'push' && args.some((a) => a === '--force' || a === '-f' || a === '--force-with-lease')) {
    return 'DANGEROUS';
  }
  if (sub === 'reset' && args.includes('--hard')) return 'DANGEROUS';
  if (sub === 'clean' && args.some((a) => a.includes('f'))) return 'DANGEROUS';
  if (sub === 'checkout' && args.includes('--')) return 'RESTRICTED';
  if (GIT_SAFE_SUBCOMMANDS.has(sub)) return 'SAFE';
  return 'RESTRICTED';
}

/**
 * Classifica um comando + args estruturados (sem shell). Pura e determinística.
 */
export function classifyCommand(command: string, args: readonly string[]): CommandClass {
  const cmd = baseName(command);
  if (cmd.length === 0) return 'UNKNOWN';

  if (BLOCKED_COMMANDS.has(cmd)) return 'BLOCKED';
  if (cmd === 'rm') return classifyRm(args);

  // Pipe para shell é BLOCKED mesmo partindo de comandos RESTRICTED (defesa em profundidade).
  if ((cmd === 'curl' || cmd === 'wget') && isPipeToShell(args)) return 'BLOCKED';

  if (DANGEROUS_COMMANDS.has(cmd)) return 'DANGEROUS';

  if (cmd === 'git') return classifyGit(args);

  if (cmd === 'find') return classifyFind(args);

  if (VERSION_ONLY_SAFE.has(cmd)) {
    return args.length > 0 && args.every((a) => a === '--version' || a === '-v' || a === '-V')
      ? 'SAFE'
      : 'RESTRICTED';
  }

  if (SAFE_COMMANDS.has(cmd)) return 'SAFE';
  if (RESTRICTED_COMMANDS.has(cmd)) return 'RESTRICTED';

  return 'UNKNOWN';
}
