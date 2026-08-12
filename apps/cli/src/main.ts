#!/usr/bin/env node
/** Entrypoint do bin `nexo` (SPEC.md §10). */

import { run } from './run.js';

const code = await run(process.argv.slice(2), { out: process.stdout, err: process.stderr });
process.exit(code);
