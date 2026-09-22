// Pinnt die Invariante "jede /api/v1/*-Route prüft checkApiAuth selbst" fest —
// hooks.server.ts lässt /api/v1/* pauschal durch (siehe auth-policy.ts), die
// Bearer-Prüfung passiert bewusst erst in der Route. Ohne diesen Test könnte
// eine neue /api/v1-Route den Aufruf vergessen und niemand würde es merken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_V1_DIR = fileURLToPath(new URL('../src/routes/api/v1', import.meta.url));

function findServerFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findServerFiles(full));
    } else if (entry === '+server.ts') {
      found.push(full);
    }
  }
  return found;
}

test('jede /api/v1/**/+server.ts-Route ruft checkApiAuth auf', () => {
  const files = findServerFiles(API_V1_DIR);
  // Ein leeres Ergebnis wäre ein Bug im Glob, kein grüner Test — sonst prüft
  // dieser Test irgendwann versehentlich gar nichts mehr.
  assert.ok(files.length > 0, 'keine +server.ts-Dateien unter src/routes/api/v1 gefunden');

  const missing = files.filter((f) => !readFileSync(f, 'utf-8').includes('checkApiAuth'));
  assert.deepEqual(missing, [], `Routen ohne checkApiAuth: ${missing.join(', ')}`);
});
