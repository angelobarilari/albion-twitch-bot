import assert from "node:assert/strict";
import test from "node:test";
import { createBlockMouse } from "./blockMouse.js";

test("a repeated freeze extends the active block instead of letting an old timer release it", () => {
  const nativeCalls: boolean[] = [];
  const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
  const cancelled: unknown[] = [];
  let currentTime = 0;
  const blockMouse = createBlockMouse({
    blockInput: (blocked) => {
      nativeCalls.push(blocked);
      return true;
    },
    setTimeout: (callback, delayMs) => {
      scheduled.push({ callback, delayMs });
      return scheduled.length;
    },
    clearTimeout: (handle) => cancelled.push(handle),
    now: () => currentTime,
    cooldownMs: () => 30_000,
  });

  blockMouse(1000);
  currentTime = 30_000;
  blockMouse(2500);

  assert.deepEqual(nativeCalls, [true, true]);
  assert.deepEqual(
    scheduled.map(({ delayMs }) => delayMs),
    [1000, 2500],
  );
  assert.deepEqual(cancelled, [1]);

  scheduled[0].callback();
  assert.deepEqual(nativeCalls, [true, true]);
  scheduled[1].callback();

  assert.deepEqual(nativeCalls, [true, true, false]);
});

test("freeze requests inside the cooldown do not extend the block", () => {
  let currentTime = 0;
  const nativeCalls: boolean[] = [];
  const blockMouse = createBlockMouse({
    blockInput: (blocked) => {
      nativeCalls.push(blocked);
      return true;
    },
    now: () => currentTime,
    cooldownMs: () => 30_000,
    setTimeout: () => 1,
  });

  blockMouse(5000);
  currentTime = 10_000;
  blockMouse(5000);

  assert.deepEqual(nativeCalls, [true]);
});

test("a failed input block does not schedule an unblock", () => {
  let scheduledCount = 0;
  const blockMouse = createBlockMouse({
    blockInput: () => false,
    setTimeout: () => {
      scheduledCount += 1;
      return scheduledCount;
    },
  });

  blockMouse(1000);

  assert.equal(scheduledCount, 0);
});
