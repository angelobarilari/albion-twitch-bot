import assert from "node:assert/strict";
import test from "node:test";
import type tmi from "tmi.js";
import type { ActionContext } from "../types/actions.js";
import { handleBitsAmount } from "./bits.js";
import { setupMessageHandler } from "./messages.js";
import type { Settings } from "../types/settings.js";

type ActionCall =
  | { type: "pressKey"; args: [string, string | undefined, ActionContext | undefined] }
  | { type: "blockMouse"; args: [number, ActionContext | undefined] }
  | { type: "redemption"; args: [string, string, string | null, ActionContext | undefined] };

const defaultSettings: Settings = {
  channel: "channel",
  cooldownMs: 3000,
  mouseFreezeDurationMs: 5000,
  mouseFreezeCooldownMs: 30_000,
  mouseFreezeActions: [],
  dryRun: false,
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
    pressKey: (key, description, context) =>
      actions.push({ type: "pressKey", args: [key, description, context] }),
    blockMouse: (durationMs, context) =>
      actions.push({ type: "blockMouse", args: [durationMs, context] }),
    simulateBits: (bits, user) =>
      handleBitsAmount(
        bits,
        user,
        {
          settings,
          pressKey: (key, description, context) =>
            actions.push({ type: "pressKey", args: [key, description, context] }),
          blockMouse: (durationMs, context) =>
            actions.push({ type: "blockMouse", args: [durationMs, context] }),
        },
        true,
      ),
    handleChannelPointRedemption: (user, rewardTitle, rewardId, context) =>
      actions.push({ type: "redemption", args: [user, rewardTitle, rewardId, context] }),
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
    {
      type: "pressKey",
      args: [
        "Q",
        'Command "press q" from alice → Q',
        { source: "test-command", event: "press q", user: "alice" },
      ],
    },
  ]);
});

test("freeze and points commands call their configured action adapters", () => {
  const harness = createHarness();

  harness.emitMessage("mousefreeze");
  harness.emitMessage("points Q Ability");

  assert.deepEqual(harness.actions, [
    {
      type: "blockMouse",
      args: [5000, { source: "test-command", event: "mousefreeze", user: "alice" }],
    },
    {
      type: "redemption",
      args: [
        "alice",
        "Q Ability",
        null,
        { source: "test-command", event: "points", user: "alice" },
      ],
    },
  ]);
});

test("bits command reuses configured bit actions in dry run", () => {
  const harness = createHarness({
    dryRun: true,
    mouseFreezeActions: [{ bits: 42 }],
    bitsActions: [{ bits: 42, key: "Q", description: "Q Ability" }],
  });

  harness.emitMessage("BITS 42");

  assert.deepEqual(harness.actions, [
    {
      type: "blockMouse",
      args: [5000, { source: "test-command", event: "42 bits", user: "alice" }],
    },
    {
      type: "pressKey",
      args: ["Q", "Q Ability", { source: "test-command", event: "42 bits", user: "alice" }],
    },
  ]);
});

test("bits command requires dry run and a positive safe integer", () => {
  const harness = createHarness({
    bitsActions: [{ bits: 42, key: "Q" }],
  });

  harness.emitMessage("bits 42");
  harness.emitMessage("bits 0");
  harness.emitMessage("bits 9007199254740992");

  assert.deepEqual(harness.actions, []);
});

test("disabled test commands and messages from the bot do not trigger actions", () => {
  const harness = createHarness({ testCommandsEnabled: false });

  harness.emitMessage("press q");
  harness.emitMessage("bits 42");
  harness.emitMessage("mousefreeze", true);

  assert.deepEqual(harness.actions, []);
});

test("test commands ignore viewers who are not moderators or broadcaster", () => {
  const harness = createHarness();

  harness.emitMessage("press q", false, "viewer", false);
  harness.emitMessage("points Q Ability", false, "viewer", false);
  harness.emitMessage("bits 42", false, "viewer", false);
  harness.emitMessage("mousefreeze", false, "viewer", false);

  assert.deepEqual(harness.actions, []);
});
