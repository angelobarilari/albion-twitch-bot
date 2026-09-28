import assert from "node:assert/strict";
import test from "node:test";
import type tmi from "tmi.js";
import { setupBitsHandler } from "./bits.js";

type RawMessage = { raw?: string };
type ActionCall =
  { type: "pressKey"; args: [string, string | undefined] } | { type: "blockMouse"; args: [number] };

/**
 * Creates a fake Twitch client and captures the actions requested by the bits handler.
 *
 * @param settings Minimal settings used by the handler under test.
 * @returns Action history and a helper for emitting raw IRC messages.
 */
function createHarness(settings: {
  mouseFreezeActions: Array<{ bits: number }>;
  mouseFreezeDurationMs: number;
  bitsActions: Array<{ bits: number; key: string; description?: string }>;
}) {
  const listeners = new Map<string, (raw: RawMessage) => void>();
  const actions: ActionCall[] = [];
  const client = {
    on(event: string, listener: (raw: RawMessage) => void) {
      listeners.set(event, listener);
    },
  };

  setupBitsHandler(client as unknown as tmi.Client, {
    settings,
    pressKey: (key, description) => actions.push({ type: "pressKey", args: [key, description] }),
    blockMouse: (durationMs) => actions.push({ type: "blockMouse", args: [durationMs] }),
  });

  return {
    actions,
    /**
     * Emits a raw Twitch IRC message to the registered handler.
     *
     * @param raw Raw IRC message text.
     * @returns Nothing.
     */
    emit(raw: string) {
      listeners.get("raw_message")?.({ raw });
    },
  };
}

test("bits event triggers configured freeze and key actions", () => {
  const harness = createHarness({
    mouseFreezeActions: [{ bits: 1 }],
    mouseFreezeDurationMs: 5000,
    bitsActions: [{ bits: 1, key: "A", description: "Dismount" }],
  });

  harness.emit("@badges=;bits=1;display-name=Viewer; :tmi.twitch.tv PRIVMSG #channel :hello");

  assert.deepEqual(harness.actions, [
    { type: "blockMouse", args: [5000] },
    { type: "pressKey", args: ["A", "Dismount"] },
  ]);
});

test("messages without a positive bits amount do not trigger actions", () => {
  const harness = createHarness({
    mouseFreezeActions: [],
    mouseFreezeDurationMs: 5000,
    bitsActions: [],
  });

  harness.emit("@badges=;display-name=Viewer; :tmi.twitch.tv PRIVMSG #channel :hello");
  harness.emit("@badges=;bits=0;display-name=Viewer; :tmi.twitch.tv PRIVMSG #channel :hello");

  assert.deepEqual(harness.actions, []);
});
