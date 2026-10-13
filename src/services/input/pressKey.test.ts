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

test("dry run logs the key action without sending it", async () => {
  const sentKeys: string[] = [];
  const pressKey = createPressKey({
    dryRun: () => true,
    sendKey: async (key) => {
      sentKeys.push(key);
    },
  });

  await pressKey("Q", "Q skill");

  assert.deepEqual(sentKeys, []);
});

test("key action and cooldown logs include action context", async () => {
  let currentTime = 10_000;
  const logs: string[] = [];
  const originalLog = console.log;
  const pressKey = createPressKey({
    now: () => currentTime,
    cooldownMs: () => 1000,
    dryRun: () => true,
  });
  console.log = (message) => logs.push(String(message));

  try {
    await pressKey("Q", "Q skill", {
      source: "bits",
      event: "42 bits",
      user: "alice",
    });
    currentTime += 1;
    await pressKey("Q", "Q skill", {
      source: "bits",
      event: "42 bits",
      user: "alice",
    });
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(logs, [
    '[DRY RUN] Q skill — would press Q [source=bits event="42 bits" user="alice"]',
    '[COOLDOWN] Action blocked (1s between actions) [source=bits event="42 bits" user="alice"]',
  ]);
});
