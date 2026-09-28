import assert from "node:assert/strict";
import test from "node:test";
import { createPressKey } from "./pressKey.js";

test("pressKey enforces the cooldown and allows an action at its boundary", async () => {
  let currentTime = 10_000;
  const sentKeys: string[] = [];
  const pressKey = createPressKey({
    now: () => currentTime,
    cooldownMs: () => 3000,
    sendKey: async (key) => {
      sentKeys.push(key);
    },
  });

  await pressKey("Q", "first action");
  currentTime += 2999;
  await pressKey("W", "blocked action");
  currentTime += 1;
  await pressKey("E", "cooldown elapsed");

  assert.deepEqual(sentKeys, ["q", "e"]);
});

test("a failed key attempt still starts the cooldown", async () => {
  let currentTime = 10_000;
  let attempts = 0;
  const pressKey = createPressKey({
    now: () => currentTime,
    cooldownMs: () => 1000,
    sendKey: async () => {
      attempts += 1;
      throw new Error("simulated adapter failure");
    },
  });

  await pressKey("Q");
  currentTime += 999;
  await pressKey("Q");

  assert.equal(attempts, 1);
});
