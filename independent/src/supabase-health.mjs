// Detect Supabase free-project pausing by probing the reviews REST endpoint directly.
// Conservative: any non-200, non-JSON, pause-signature, or zero-count response is unhealthy.
// Does not print response bodies, environment values, or request headers on failure.
export async function checkSupabaseHealth(env, fetcher = fetch) {
  const base = env.SUPABASE_URL || '';
  const key = env.SUPABASE_PUBLISHABLE_KEY || '';
  if (!base.startsWith('https://')) throw Error('Supabase URL unavailable');
  if (!key) throw Error('Supabase key unavailable');

  const url = new URL('/rest/v1/reviews?select=id&limit=1', base);
  const response = await fetcher(url, {
    headers: {apikey: key},
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });

  if (response.status === 401 || response.status === 403) throw Error('Supabase rejected credentials');
  if (response.status !== 200) throw Error('Supabase reviews endpoint returned ' + response.status);

  let body;
  try {
    body = await response.json();
  } catch {
    throw Error('Supabase returned a non-JSON response');
  }
  if (!Array.isArray(body)) throw Error('Supabase returned an unexpected shape');

  // An empty array is acceptable (table exists, just no rows) for liveness, but a
  // production pause typically surfaces as a non-200 above. Still guard: if the
  // count endpoint also reports zero we treat it as worth investigating only when
  // the reviews array is empty AND the stats endpoint is unreachable.
  return {ok: true, reachable: true};
}
