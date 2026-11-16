import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkSupabaseHealth} from '../src/supabase-health.mjs';

function jsonOk(rows) {
  return async () => ({status: 200, ok: true, json: async () => rows, headers: new Map()});
}

test('a healthy reviews endpoint reports ok', async () => {
  const result = await checkSupabaseHealth(
    {SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'},
    jsonOk([{id: 'r1'}]),
  );
  assert.equal(result.ok, true);
  assert.equal(result.reachable, true);
});

test('a non-200 status is unhealthy', async () => {
  const fetcher = async () => ({status: 500, ok: false, json: async () => ({}), headers: new Map()});
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'}, fetcher),
    /returned 500/,
  );
});

test('a paused-project signature (400) is unhealthy', async () => {
  const fetcher = async () => ({status: 400, ok: false, json: async () => ({message: 'paused'}), headers: new Map()});
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'}, fetcher),
    /returned 400/,
  );
});

test('a non-JSON response is unhealthy', async () => {
  const fetcher = async () => ({status: 200, ok: true, json: async () => { throw Error('not json'); }, text: async () => '<html>', headers: new Map()});
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'}, fetcher),
    /non-JSON/,
  );
});

test('a non-array JSON shape is unhealthy', async () => {
  const fetcher = async () => ({status: 200, ok: true, json: async () => ({error: 'weird'}), headers: new Map()});
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'}, fetcher),
    /unexpected shape/,
  );
});

test('rejected credentials are reported distinctly', async () => {
  const fetcher = async () => ({status: 401, ok: false, json: async () => ({}), headers: new Map()});
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'}, fetcher),
    /rejected credentials/,
  );
});

test('missing configuration is rejected before any request', async () => {
  await assert.rejects(() => checkSupabaseHealth({}, async () => ({})), /Supabase URL unavailable/);
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'https://example.supabase.co'}, async () => ({})),
    /Supabase key unavailable/,
  );
});

test('an insecure base URL is rejected', async () => {
  await assert.rejects(
    () => checkSupabaseHealth({SUPABASE_URL: 'http://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'k'}, async () => ({})),
    /Supabase URL unavailable/,
  );
});
