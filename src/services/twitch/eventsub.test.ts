import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import WebSocket from "ws";
import type { ActionContext } from "../../types/actions.js";
import type { Settings } from "../../types/settings.js";
import { connectEventSub } from "./eventsub.js";

class MockWebSocket extends EventEmitter {
  readyState = WebSocket.OPEN;
  closeCount = 0;

  send(_message: string) {}

  close() {
    this.closeCount += 1;
    this.emit("close");
  }
}

const channelPointsActions: Settings["channelPointsActions"] = [
  { rewardId: "reward-1", rewardTitle: "Q Ability", key: "Q", description: "Q skill" },
  { rewardTitle: "W Ability", key: "W", description: "W skill" },
];

function createHarness(fetchStatus = 202) {
  const sockets: MockWebSocket[] = [];
  const socketUrls: string[] = [];
  const keyActions: Array<[string, string | undefined, ActionContext | undefined]> = [];
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const timers: Array<{ callback: () => void; delay: number }> = [];
  const clearedTimers: unknown[] = [];

  connectEventSub("channel-123", "test-client-id", "test-token", {
    createWebSocket: (url) => {
      socketUrls.push(url);
      const socket = new MockWebSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    fetch: async (input, init) => {
      requests.push({ url: String(input), init: init ?? {} });
      return new Response(null, { status: fetchStatus });
    },
    settings: { channelPointsActions },
    pressKey: (key, description, context) => {
      keyActions.push([key, description, context]);
      return Promise.resolve();
    },
    timers: {
      setTimeout: (callback, delay) => {
        timers.push({ callback, delay });
        return timers.length;
      },
      clearTimeout: (handle) => clearedTimers.push(handle),
    },
  });

  return { sockets, socketUrls, keyActions, requests, timers, clearedTimers };
}

function emitMessage(socket: MockWebSocket, value: unknown) {
  socket.emit("message", Buffer.from(JSON.stringify(value)));
}

function welcome(sessionId = "session-123", keepaliveTimeoutSeconds = 10) {
  return {
    metadata: { message_type: "session_welcome" },
    payload: {
      session: { id: sessionId, keepalive_timeout_seconds: keepaliveTimeoutSeconds },
    },
  };
}

async function flushAsyncHandlers() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test("EventSub subscribes through Helix after receiving the WebSocket welcome", async () => {
  const harness = createHarness();
  assert.deepEqual(harness.socketUrls, ["wss://eventsub.wss.twitch.tv/ws"]);

  emitMessage(harness.sockets[0], welcome());
  await flushAsyncHandlers();

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0].url, "https://api.twitch.tv/helix/eventsub/subscriptions");
  assert.equal(harness.requests[0].init.method, "POST");
  assert.deepEqual(harness.requests[0].init.headers, {
    "Client-Id": "test-client-id",
    Authorization: ["Bearer", "test-token"].join(" "),
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(String(harness.requests[0].init.body)), {
    type: "channel.channel_points_custom_reward_redemption.add",
    version: "1",
    condition: { broadcaster_user_id: "channel-123" },
    transport: { method: "websocket", session_id: "session-123" },
  });
  assert.equal(harness.timers[0].delay, 10_000);
});

test("EventSub maps channel point notifications by reward ID or title", () => {
  const harness = createHarness();

  for (const [user, reward] of [
    ["Viewer", { id: "reward-1", title: "Renamed reward" }],
    ["OtherViewer", { title: "w ability" }],
  ] as const) {
    emitMessage(harness.sockets[0], {
      metadata: {
        message_type: "notification",
        subscription_type: "channel.channel_points_custom_reward_redemption.add",
      },
      payload: { event: { user_name: user, reward } },
    });
  }

  assert.deepEqual(harness.keyActions, [
    ["Q", "Q skill", { source: "channel-points", event: "Renamed reward", user: "Viewer" }],
    ["W", "W skill", { source: "channel-points", event: "w ability", user: "OtherViewer" }],
  ]);
});

test("EventSub ignores malformed and unrelated messages", () => {
  const harness = createHarness();
  harness.sockets[0].emit("message", Buffer.from("not json"));
  emitMessage(harness.sockets[0], { metadata: { message_type: "session_keepalive" } });
  emitMessage(harness.sockets[0], {
    metadata: { message_type: "notification", subscription_type: "channel.follow" },
    payload: { event: {} },
  });
  emitMessage(harness.sockets[0], {
    metadata: {
      message_type: "notification",
      subscription_type: "channel.channel_points_custom_reward_redemption.add",
    },
    payload: { event: { user_name: "Viewer", reward: {} } },
  });

  assert.deepEqual(harness.keyActions, []);
});

test("EventSub transfers the session on Twitch reconnect without resubscribing", async () => {
  const harness = createHarness();
  emitMessage(harness.sockets[0], welcome());
  await flushAsyncHandlers();
  emitMessage(harness.sockets[0], {
    metadata: { message_type: "session_reconnect" },
    payload: { session: { reconnect_url: "wss://eventsub-reconnect.test/session" } },
  });

  assert.equal(harness.sockets[0].closeCount, 0);
  assert.deepEqual(harness.socketUrls, [
    "wss://eventsub.wss.twitch.tv/ws",
    "wss://eventsub-reconnect.test/session",
  ]);
  emitMessage(harness.sockets[1], welcome("transferred-session"));
  await flushAsyncHandlers();
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.sockets[0].closeCount, 1);

  assert.deepEqual(
    harness.timers.map((timer) => timer.delay),
    [10_000, 10_000, 10_000],
  );
  assert.deepEqual(harness.clearedTimers, [1, 2]);
});

test("EventSub retries closed sockets with an increasing backoff", () => {
  const harness = createHarness();
  harness.sockets[0].emit("close");
  harness.sockets[0].emit("close");

  assert.deepEqual(
    harness.timers.map((timer) => timer.delay),
    [5_000],
  );
  harness.timers[0].callback();
  assert.equal(harness.sockets.length, 2);

  harness.sockets[1].emit("close");
  assert.deepEqual(
    harness.timers.map((timer) => timer.delay),
    [5_000, 10_000],
  );
});

test("EventSub retries a failed keepalive deadline", () => {
  const harness = createHarness();
  emitMessage(harness.sockets[0], welcome("session-123", 1));

  harness.timers[0].callback();
  assert.equal(harness.sockets[0].closeCount, 1);
  assert.equal(harness.timers[1].delay, 5_000);
});
