// hooks.server.ts importiert SvelteKits virtuelle Alias-Module
// ("$app/environment", "$lib/...", die es außerhalb von Vite nicht gibt).
// Der Loader-Hook in tests/helpers/sveltekit-stub-loader.mjs bildet sie auf
// echte Dateien ab — das ist der einzige Grund, warum "handle" hier direkt
// importierbar ist, ohne die volle SvelteKit-Runtime zu starten. handle()
// selbst rührt nur event.url, event.cookies.get(), event.request.headers.get()
// an und ruft resolve(event) auf, siehe unten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./helpers/sveltekit-stub-loader.mjs', import.meta.url);

const { handle } = await import('../src/hooks.server.ts');
const { createSessionToken } = await import('../src/lib/server/session.ts');

type FakeEventOpts = {
  cookie?: string;
  headers?: Record<string, string>;
};

/** Kleinster Fake-Event, der genau die Oberfläche bedient, die handle() anfasst. */
function makeEvent(pathname: string, opts: FakeEventOpts = {}) {
  const url = new URL(`https://crm.hirschfeld.at${pathname}`);
  const headers = new Headers(opts.headers ?? {});
  return {
    url,
    cookies: {
      get: (name: string) => (name === 'crm_session' ? opts.cookie : undefined)
    },
    request: {
      headers: {
        get: (name: string) => headers.get(name)
      }
    }
  } as any;
}

function makeResolve() {
  let called = false;
  const resolve = async () => {
    called = true;
    return new Response('ok', { headers: new Headers() });
  };
  return { resolve, wasCalled: () => called };
}

/** process.env ist globaler, veränderlicher Zustand — jeder Test räumt ihn selbst wieder auf. */
async function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) saved[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('unauthentifizierte Anfrage auf eine geschützte Seite wird zu /login umgeleitet', async () => {
  await withEnv({ SESSION_SECRET: undefined, TRUST_PROXY_USER: undefined }, async () => {
    const event = makeEvent('/contacts');
    const { resolve, wasCalled } = makeResolve();
    // handle() nutzt hier throw redirect(...) statt einer zurückgegebenen
    // Response — SvelteKits eigener Redirect-Helfer wirft ein Objekt mit
    // status/location statt eines echten Response, deshalb try/catch.
    await assert.rejects(
      () => handle({ event, resolve } as any),
      (err: any) => {
        assert.equal(err.status, 303);
        assert.match(err.location ?? '', /^\/login\?next=/);
        return true;
      }
    );
    assert.equal(wasCalled(), false);
  });
});

test('unauthentifizierte Anfrage auf eine geschützte API-Route bekommt 401 JSON, keinen Redirect', async () => {
  await withEnv({ SESSION_SECRET: undefined, TRUST_PROXY_USER: undefined }, async () => {
    const event = makeEvent('/api/search');
    const { resolve, wasCalled } = makeResolve();
    const response = await handle({ event, resolve } as any);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    const body = await response.json();
    assert.equal(body.error, 'Unauthorized');
    assert.equal(wasCalled(), false);
  });
});

test('gültige, nicht abgelaufene Sitzung erreicht resolve() und bekommt die Security-Header', async () => {
  await withEnv({ SESSION_SECRET: 'test-geheimnis-lang-genug', TRUST_PROXY_USER: undefined }, async () => {
    const token = createSessionToken('test-geheimnis-lang-genug', Date.now(), 60_000);
    const event = makeEvent('/contacts', { cookie: token });
    const { resolve, wasCalled } = makeResolve();
    const response = await handle({ event, resolve } as any);
    assert.equal(wasCalled(), true);
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'same-origin');
    assert.equal(response.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  });
});

test('TRUST_PROXY_USER nicht gesetzt: remote-user-Header allein reicht nicht, es geht zu /login', async () => {
  await withEnv({ SESSION_SECRET: undefined, TRUST_PROXY_USER: undefined }, async () => {
    const event = makeEvent('/contacts', { headers: { 'remote-user': 'felix' } });
    const { resolve, wasCalled } = makeResolve();
    await assert.rejects(
      () => handle({ event, resolve } as any),
      (err: any) => {
        assert.equal(err.status, 303);
        return true;
      }
    );
    assert.equal(wasCalled(), false);
  });
});

test('TRUST_PROXY_USER=1 gesetzt und remote-user-Header vorhanden: vertraut, erreicht resolve()', async () => {
  await withEnv({ SESSION_SECRET: undefined, TRUST_PROXY_USER: '1' }, async () => {
    const event = makeEvent('/contacts', { headers: { 'remote-user': 'felix' } });
    const { resolve, wasCalled } = makeResolve();
    const response = await handle({ event, resolve } as any);
    assert.equal(wasCalled(), true);
    assert.equal(response.status, 200);
  });
});

test('TRUST_PROXY_USER=1 aber ohne remote-user-Header: bleibt ungültig, es geht zu /login', async () => {
  await withEnv({ SESSION_SECRET: undefined, TRUST_PROXY_USER: '1' }, async () => {
    const event = makeEvent('/contacts');
    const { resolve, wasCalled } = makeResolve();
    await assert.rejects(
      () => handle({ event, resolve } as any),
      (err: any) => {
        assert.equal(err.status, 303);
        return true;
      }
    );
    assert.equal(wasCalled(), false);
  });
});

test('next-Redirect entfernt __data.json-Suffix und x-sveltekit-invalidated', async () => {
  await withEnv({ SESSION_SECRET: undefined, TRUST_PROXY_USER: undefined }, async () => {
    const event = makeEvent('/contacts/__data.json?x-sveltekit-invalidated=001');
    const { resolve } = makeResolve();
    await assert.rejects(
      () => handle({ event, resolve } as any),
      (err: any) => {
        const location = err.location ?? '';
        const next = decodeURIComponent(location.replace('/login?next=', ''));
        assert.equal(next, '/contacts');
        return true;
      }
    );
  });
});
