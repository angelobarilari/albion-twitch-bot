import WebSocket from "ws";
import { pressKey } from "../input/pressKey.js";
import type { ActionContext } from "../../types/actions.js";
import { formatActionContext } from "../../utils/actionContext.js";
import settingsModule = require("../../settings.js");
import type { Settings } from "../../types/settings.js";

const { settings } = settingsModule;

type JsonRecord = Record<string, unknown>;
type EventSubSettings = Pick<Settings, "channelPointsActions">;
type TimerAdapters = {
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(handle: unknown): void;
};
type EventSubDependencies = {
  createWebSocket?: (url: string) => WebSocket;
  fetch?: typeof fetch;
  settings?: EventSubSettings;
  pressKey?: typeof pressKey;
  timers?: TimerAdapters;
};

const EVENTSUB_URL = "wss://eventsub.wss.twitch.tv/ws";
const SUBSCRIPTIONS_URL = "https://api.twitch.tv/helix/eventsub/subscriptions";
const SUBSCRIPTION_TYPE = "channel.channel_points_custom_reward_redemption.add";
const INITIAL_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

const defaultTimers: TimerAdapters = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Finds the matching configured reward and requests its associated key action.
 */
export function handleChannelPointRedemption(
  user: string,
  rewardTitle: string,
  rewardId: string | null,
  dependencies: Pick<EventSubDependencies, "settings" | "pressKey"> = {},
  context?: ActionContext,
): void {
  const actionContext = context ?? {
    source: "channel-points" as const,
    event: rewardTitle,
    user,
  };
  console.log(
    `\n[POINTS] Redeemed ${JSON.stringify(rewardTitle)}${formatActionContext(actionContext)}`,
  );

  const action = (dependencies.settings ?? settings).channelPointsActions.find(
    (item) =>
      item.rewardId === rewardId || item.rewardTitle?.toLowerCase() === rewardTitle.toLowerCase(),
  );

  if (action) {
    console.log(
      `[MAPPING] Reward ${JSON.stringify(rewardTitle)} -> key ${action.key}${formatActionContext(actionContext)}`,
    );
    (dependencies.pressKey ?? pressKey)(action.key, action.description, actionContext);
  } else {
    console.log(`  [UNMAPPED] Reward not configured${formatActionContext(actionContext)}.`);
    console.log("  [INFO] Add this mapping to settings.json:");
    console.log(`  { "rewardTitle": "${rewardTitle}", "key": "Q", "description": "..." }`);
  }
}

/**
 * Opens an EventSub WebSocket and subscribes to channel point redemptions.
 */
export function connectEventSub(
  channelId: string,
  clientId: string,
  token: string,
  dependencies: EventSubDependencies = {},
): void {
  openEventSubConnection(
    channelId,
    clientId,
    token,
    dependencies,
    EVENTSUB_URL,
    true,
    0,
    undefined,
  );
}

async function createSubscription(
  channelId: string,
  clientId: string,
  token: string,
  sessionId: string,
  dependencies: EventSubDependencies,
): Promise<void> {
  try {
    const response = await (dependencies.fetch ?? fetch)(SUBSCRIPTIONS_URL, {
      method: "POST",
      headers: {
        "Client-Id": clientId,
        Authorization: ["Bearer", token].join(" "),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: SUBSCRIPTION_TYPE,
        version: "1",
        condition: { broadcaster_user_id: channelId },
        transport: { method: "websocket", session_id: sessionId },
      }),
    });

    if (!response.ok) {
      console.error(`[EVENTSUB] Subscription request failed with status ${response.status}.`);
      if (response.status === 401 || response.status === 403) {
        console.error(
          "[EVENTSUB] Check that the broadcaster token is valid, matches the Client ID, and has the channel:read:redemptions scope.",
        );
      }
      return;
    }

    console.log("[EVENTSUB] Subscribed — listening for channel point redemptions.");
  } catch (error) {
    console.error("[EVENTSUB] Subscription request failed:", error);
  }
}

function openEventSubConnection(
  channelId: string,
  clientId: string,
  token: string,
  dependencies: EventSubDependencies,
  url: string,
  subscribeOnWelcome: boolean,
  reconnectAttempt: number,
  onWelcome: (() => void) | undefined,
): void {
  const ws = dependencies.createWebSocket?.(url) ?? new WebSocket(url);
  const timers = dependencies.timers ?? defaultTimers;
  let reconnectScheduled = false;
  let subscriptionRequested = false;
  let keepaliveTimer: unknown;
  let keepaliveTimeoutMs = 0;

  const resetKeepaliveTimer = () => {
    if (!keepaliveTimeoutMs) return;
    if (keepaliveTimer !== undefined) timers.clearTimeout(keepaliveTimer);
    keepaliveTimer = timers.setTimeout(() => {
      console.warn("[EVENTSUB] Keepalive timed out; reconnecting.");
      ws.close();
    }, keepaliveTimeoutMs);
  };

  ws.on("message", (data) => {
    let message: unknown;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (!isRecord(message) || !isRecord(message.metadata)) return;
    resetKeepaliveTimer();
    const messageType = message.metadata.message_type;

    if (messageType === "session_welcome") {
      if (!isRecord(message.payload) || !isRecord(message.payload.session)) return;
      const session = message.payload.session;
      if (typeof session.id !== "string") return;
      if (typeof session.keepalive_timeout_seconds === "number") {
        keepaliveTimeoutMs = session.keepalive_timeout_seconds * 1000;
        resetKeepaliveTimer();
      }
      onWelcome?.();
      if (subscribeOnWelcome && !subscriptionRequested) {
        subscriptionRequested = true;
        void createSubscription(channelId, clientId, token, session.id, dependencies);
      } else if (!subscribeOnWelcome) {
        console.log("[EVENTSUB] Reconnected and resumed the existing subscription.");
      }
      return;
    }

    if (messageType === "session_reconnect") {
      if (!isRecord(message.payload) || !isRecord(message.payload.session)) {
        console.error("[EVENTSUB] Twitch sent an invalid session reconnect message.");
        ws.close();
        return;
      }
      const reconnectUrl = message.payload.session.reconnect_url;
      if (typeof reconnectUrl !== "string") {
        console.error("[EVENTSUB] Twitch sent an invalid session reconnect URL.");
        ws.close();
        return;
      }
      if (!reconnectUrl.startsWith("wss://")) {
        console.error("[EVENTSUB] Twitch provided an invalid reconnect URL.");
        ws.close();
        return;
      }

      reconnectScheduled = true;
      openEventSubConnection(channelId, clientId, token, dependencies, reconnectUrl, false, 0, () =>
        ws.close(),
      );
      return;
    }

    if (messageType === "revocation") {
      const status =
        isRecord(message.payload) &&
        isRecord(message.payload.subscription) &&
        typeof message.payload.subscription.status === "string"
          ? message.payload.subscription.status
          : "unknown reason";
      console.error(`[EVENTSUB] Twitch revoked the channel point subscription: ${status}.`);
      return;
    }

    if (messageType !== "notification" || !isRecord(message.payload)) return;
    if (message.metadata.subscription_type !== SUBSCRIPTION_TYPE) return;

    const event = message.payload.event;
    if (!isRecord(event) || !isRecord(event.reward)) return;
    const user =
      typeof event.user_name === "string"
        ? event.user_name
        : typeof event.user_login === "string"
          ? event.user_login
          : null;
    const title = event.reward.title;
    if (user === null || typeof title !== "string") return;

    const rewardId = typeof event.reward.id === "string" ? event.reward.id : null;
    handleChannelPointRedemption(user, title, rewardId, dependencies);
  });

  ws.on("close", () => {
    if (keepaliveTimer !== undefined) timers.clearTimeout(keepaliveTimer);
    if (reconnectScheduled) return;
    reconnectScheduled = true;
    const reconnectDelay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    );
    console.warn(`[EVENTSUB] Disconnected, reconnecting in ${reconnectDelay / 1000}s...`);
    timers.setTimeout(
      () =>
        openEventSubConnection(
          channelId,
          clientId,
          token,
          dependencies,
          EVENTSUB_URL,
          true,
          reconnectAttempt + 1,
          undefined,
        ),
      reconnectDelay,
    );
  });

  ws.on("error", (error) => {
    console.error("[EVENTSUB] Connection error:", error.message);
  });
}
