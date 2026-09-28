import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import WebSocket from "ws";
import type { Settings } from "../../types/settings.js";
import { connectPubSub } from "./pubsub.js";

class MockWebSocket extends EventEmitter {
  readyState = WebSocket.OPEN;
  sent: string[] = [];
  closeCount = 0;

  send(message: string) {
    this.sent.push(message);
  }

  close() {
    this.closeCount += 1;
  }
}

const channelPointsActions: Settings["channelPointsActions"] = [
  { rewardId: "reward-1", rewardTitle: "Q Ability", key: "Q", description: "Q skill" },
  { rewardTitle: "W Ability", key: "W", description: "W skill" },
];

function createHarness() {
  const socket = new MockWebSocket();
  const keyActions: Array<[string, string | undefined]> = [];
  const intervals: Array<{ callback: () => void; delay: number }> = [];
  const clearedIntervals: unknown[] = [];
  const timeouts: Array<{ callback: () => void; delay: number }> = [];

  connectPubSub("channel-123", "test-token", {
    createWebSocket: () => socket as unknown as WebSocket,
    settings: { channelPointsActions },
    pressKey: (key, description) => {
      keyActions.push([key, description]);
      return Promise.resolve();
    },
    timers: {
      setInterval: (callback, delay) => {
        intervals.push({ callback, delay });
        return intervals.length;
      },
      clearInterval: (handle) => clearedIntervals.push(handle),
      setTimeout: (callback, delay) => {
        timeouts.push({ callback, delay });
        return timeouts.length;
      },
    },
  });

  return { socket, keyActions, intervals, clearedIntervals, timeouts };
}

function emitRedemption(
  socket: MockWebSocket,
  reward: { title: string; id?: string },
  user = "Viewer",
) {
  socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "MESSAGE",
        data: {
          message: JSON.stringify({
            type: "reward-redeemed",
            data: { redemption: { user: { display_name: user }, reward } },
          }),
        },
      }),
    ),
  );
}

test("PubSub subscribes to the channel and sends ping through injected timers", () => {
  const harness = createHarness();
  harness.socket.emit("open");

  assert.deepEqual(JSON.parse(harness.socket.sent[0]), {
    type: "LISTEN",
    data: { topics: ["channel-points-channel-v1.channel-123"], auth_token: "test-token" },
  });
  assert.equal(harness.intervals[0].delay, 4 * 60 * 1000);

  harness.intervals[0].callback();
  assert.deepEqual(JSON.parse(harness.socket.sent[1]), { type: "PING" });
});

test("PubSub matches redemptions by ID or case-insensitive title", () => {
  const harness = createHarness();
  emitRedemption(harness.socket, { id: "reward-1", title: "Renamed reward" });
  emitRedemption(harness.socket, { title: "w ability" });

  assert.deepEqual(harness.keyActions, [
    ["Q", "Q skill"],
    ["W", "W skill"],
  ]);
});

test("PubSub ignores malformed and unrelated messages", () => {
  const harness = createHarness();
  harness.socket.emit("message", Buffer.from("not json"));
  harness.socket.emit(
    "message",
    Buffer.from(JSON.stringify({ type: "MESSAGE", data: { message: "{" } })),
  );
  harness.socket.emit("message", Buffer.from(JSON.stringify({ type: "NOTICE" })));
  harness.socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "MESSAGE",
        data: { message: JSON.stringify({ type: "other-event", data: {} }) },
      }),
    ),
  );

  assert.deepEqual(harness.keyActions, []);
});

test("PubSub closes on reconnect and clears its interval before scheduling reconnect", () => {
  const harness = createHarness();
  harness.socket.emit("open");
  harness.socket.emit("message", Buffer.from(JSON.stringify({ type: "RECONNECT" })));
  harness.socket.emit("close");

  assert.equal(harness.socket.closeCount, 1);
  assert.deepEqual(harness.clearedIntervals, [1]);
  assert.equal(harness.timeouts[0].delay, 5000);
});

test("PubSub schedules only one retry and increases delay with a capped backoff", () => {
  const sockets: MockWebSocket[] = [];
  const timeouts: Array<{ callback: () => void; delay: number }> = [];
  const dependencies = {
    createWebSocket: () => {
      const socket = new MockWebSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    settings: { channelPointsActions },
    pressKey: () => Promise.resolve(),
    timers: {
      setInterval: () => 1,
      clearInterval: () => {},
      setTimeout: (callback: () => void, delay: number) => {
        timeouts.push({ callback, delay });
        return timeouts.length;
      },
    },
  };

  connectPubSub("channel-123", "test-token", dependencies);
  sockets[0].emit("close");
  sockets[0].emit("close");

  assert.equal(timeouts.length, 1);
  assert.equal(timeouts[0].delay, 5000);
  timeouts[0].callback();
  sockets[1].emit("close");

  assert.equal(timeouts[1].delay, 10_000);
});
