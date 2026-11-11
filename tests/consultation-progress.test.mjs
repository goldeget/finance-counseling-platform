import { test } from 'node:test';
import assert from 'node:assert/strict';

const module = await import('../public/consultation-progress.mjs').catch(() => ({}));

test('reduced motion completes immediately without scheduling animation frames', () => {
  const updates = [];
  let completed = 0;
  let frames = 0;
  module.startConsultationProgress?.({
    reducedMotion: true,
    now: () => 100,
    requestFrame: () => { frames++; },
    onUpdate: percent => updates.push(percent),
    onComplete: () => { completed++; },
  });
  assert.deepEqual(updates, [100]);
  assert.equal(completed, 1);
  assert.equal(frames, 0);
});

test('normal animation progresses to completion exactly once', () => {
  const updates = [];
  const frames = [];
  let completed = 0;
  module.startConsultationProgress?.({
    reducedMotion: false,
    now: () => 100,
    requestFrame: callback => frames.push(callback),
    onUpdate: percent => updates.push(percent),
    onComplete: () => { completed++; },
  });
  while (frames.length) {
    const callback = frames.shift();
    callback(100 + updates.length * 600);
  }
  assert.equal(updates[0], 1);
  assert.equal(updates.at(-1), 100);
  assert.ok(updates.every((value, i) => !i || value >= updates[i - 1]));
  assert.equal(completed, 1);
});
