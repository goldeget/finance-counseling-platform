import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
test('scheduled retention records success only after cleanup has completed',async()=>{
  const queries=[];
  const db={prepare(sql){return {bind(...args){return {async run(){queries.push({sql,args});return {meta:{changes:0}}}}}}}};
  await worker.scheduled({scheduledTime:Date.parse('2026-11-14T18:00:00Z')},{DB:db});
  assert.match(queries.at(-1).sql,/INSERT INTO maintenance_status/);
  assert.ok(queries.some(x=>x.sql.includes('DELETE FROM applications')));
  assert.ok(queries.some(x=>x.sql.includes('DELETE FROM submission_limits')));
});
test('failed cleanup never records a successful retention run',async()=>{
  const queries=[];
  const db={prepare(sql){return {bind(){return {async run(){queries.push(sql);if(sql.includes('submission_limits'))throw Error('failure');return {meta:{changes:0}}}}}}}};
  await assert.rejects(worker.scheduled({scheduledTime:Date.parse('2026-11-14T18:00:00Z')},{DB:db}));
  assert.ok(!queries.some(x=>x.includes('INSERT INTO maintenance_status')));
});
