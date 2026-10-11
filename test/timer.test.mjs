import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Countdown } from '../timer.js';

function fakeClock(startMs) {
  let t = startMs;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test('Countdown descuenta y avisa una vez al llegar', () => {
  const c = fakeClock(1000000);
  let done = 0;
  const cd = new Countdown({ nowFn: c.now, onDone: () => { done++; } });
  cd.start(90);
  assert.equal(cd.remaining(), 90);
  c.advance(30000);
  assert.equal(cd.poll(), 60);
  c.advance(60000);
  assert.equal(cd.poll(), 0);
  assert.equal(done, 1);
  c.advance(10000);
  cd.poll();
  assert.equal(done, 1);
});

test('Countdown stop cancela el aviso', () => {
  const c = fakeClock(0);
  let done = 0;
  const cd = new Countdown({ nowFn: c.now, onDone: () => { done++; } });
  cd.start(60);
  c.advance(10000);
  cd.stop();
  c.advance(60000);
  cd.poll();
  assert.equal(done, 0);
  assert.equal(cd.remaining(), 0);
});

test('Countdown reiniciar reemplaza el anterior', () => {
  const c = fakeClock(0);
  let done = 0;
  const cd = new Countdown({ nowFn: c.now, onDone: () => { done++; } });
  cd.start(60);
  c.advance(10000);
  cd.start(120);
  assert.equal(cd.remaining(), 120);
  c.advance(60000);
  cd.poll();
  assert.equal(done, 0);
  c.advance(60000);
  cd.poll();
  assert.equal(done, 1);
});
