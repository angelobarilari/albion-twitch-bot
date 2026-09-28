import assert from "node:assert/strict";
import test from "node:test";
import type tmi from "tmi.js";
import { setupMessageHandler } from "./messages.js";
import type { Settings } from "../types/settings.js";

type ActionCall =
  | { type: "pressKey"; args: [string, string | undefined] }
  | { type: "blockMouse"; args: [number] }
  | { type: "redemption"; args: [string, string, string | null] };

const defaultSettings: Settings = {
  channel: "channel",
  cooldownMs: 3000,
  mouseFreezeDurationMs: 5000,
  mouseFreezeCooldownMs: 30_000,
  mouseFreezeActions: [],
  testCommandsEnabled: true,
  testMouseFreezeCommand: "mousefreeze",
  testCommands: [{ command: "press q", key: "Q" }],
  bitsActions: [],
  channelPointsActions: [],
};

/**
 * Creates a fake Twitch client and records the action adapters used by the message handler.
 *
 * @param settingsOverride Optional settings that replace the test defaults.
 * @returns Captured action history and a helper for emitting chat messages.
 */
function createHarness(settingsOverride: Partial<Settings> = {}) {
  const settings = { ...defaultSettings, ...settingsOverride };
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const actions: ActionCall[] = [];
  const client = {
    on(event: string, listener: (...args: unknown[]) => void) {
      listeners.set(event, listener);
    },
  } as unknown as tmi.Client;

  setupMessageHandler(client, {
    settings,
    pressKey: (key, description) => actions.push({ type: "pressKey", args: [key, description] }),
    blockMouse: (durationMs) => actions.push({ type: "blockMouse", args: [durationMs] }),
    handleChannelPointRedemption: (user, rewardTitle, rewardId) =>
      actions.push({ type: "redemption", args: [user, rewardTitle, rewardId] }),
  });

  return {
    actions,
    /**
     * Emits a chat message to the registered handler.
     *
     * @param message Message text from the chat user.
     * @param self Whether the message was sent by the bot itself.
     * @param username Username attached to the simulated Twitch message.
     * @returns Nothing.
     */
    emitMessage(message: string, self = false, username = "alice", moderator = true) {
      listeners.get("message")?.("#channel", { username, mod: moderator }, message, self);
    },
  };
}

test("configured chat command presses its mapped key", () => {
  const harness = createHarness();

  harness.emitMessage("PRESS Q");

  assert.deepEqual(harness.actions, [
    { type: "pressKey", args: ["Q", 'Command "press q" from alice → Q'] },
  ]);
});

test("freeze and points commands call their configured action adapters", () => {
  const harness = createHarness();

  harness.emitMessage("mousefreeze");
  harness.emitMessage("points Q Ability");

  assert.deepEqual(harness.actions, [
    { type: "blockMouse", args: [5000] },
    { type: "redemption", args: ["alice", "Q Ability", null] },
  ]);
});

test("disabled test commands and messages from the bot do not trigger actions", () => {
  const harness = createHarness({ testCommandsEnabled: false });

  harness.emitMessage("press q");
  harness.emitMessage("mousefreeze", true);

  assert.deepEqual(harness.actions, []);
});

test("test commands ignore viewers who are not moderators or broadcaster", () => {
  const harness = createHarness();

  harness.emitMessage("press q", false, "viewer", false);
  harness.emitMessage("points Q Ability", false, "viewer", false);
  harness.emitMessage("mousefreeze", false, "viewer", false);

  assert.deepEqual(harness.actions, []);
});
