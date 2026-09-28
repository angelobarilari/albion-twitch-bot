import assert from "node:assert/strict";
import test from "node:test";
import type tmi from "tmi.js";
import { setupChatHandlers } from "./chatHandler.js";

test("IRC disconnect leaves reconnection to tmi.js", () => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  let connectCalls = 0;
  const client = {
    on(event: string, listener: (...args: unknown[]) => void) {
      listeners.set(event, listener);
    },
    connect() {
      connectCalls += 1;
      return Promise.resolve();
    },
  } as unknown as tmi.Client;

  setupChatHandlers(client);

  listeners.get("disconnected")?.("test disconnect");

  assert.equal(connectCalls, 0);
});
