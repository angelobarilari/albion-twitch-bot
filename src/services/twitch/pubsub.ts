import WebSocket from "ws";
import { pressKey } from "../input/pressKey.js";
import settingsModule = require("../../settings.js");
import type { Settings } from "../../types/settings.js";

const { settings } = settingsModule;

type JsonRecord = Record<string, unknown>;
type PubSubSettings = Pick<Settings, "channelPointsActions">;
type TimerAdapters = {
  setInterval(callback: () => void, delay: number): unknown;
  clearInterval(handle: unknown): void;
  setTimeout(callback: () => void, delay: number): unknown;
};
type PubSubDependencies = {
  createWebSocket?: (url: string) => WebSocket;
  settings?: PubSubSettings;
  pressKey?: typeof pressKey;
  timers?: TimerAdapters;
};

const INITIAL_RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

const defaultTimers: TimerAdapters = {
  setInterval: (callback, delay) => setInterval(callback, delay),
  clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
};

/**
 * Narrows an unknown JSON value to a plain object.
 *
 * @param value Value parsed from an external JSON message.
 * @returns Whether the value is a non-null, non-array object.
 */
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Finds the matching configured reward and requests its associated key action.
 *
 * @param user Display name of the user who redeemed the reward.
 * @param rewardTitle Title of the redeemed channel point reward.
 * @param rewardId Reward identifier, or null when it is not available.
 * @returns Nothing.
 */
export function handleChannelPointRedemption(
  user: string,
  rewardTitle: string,
  rewardId: string | null,
  dependencies: Pick<PubSubDependencies, "settings" | "pressKey"> = {},
): void {
  console.log(`\n[POINTS] ${user} redeemed "${rewardTitle}"`);

  const action = (dependencies.settings ?? settings).channelPointsActions.find(
    (item) =>
      item.rewardId === rewardId || item.rewardTitle?.toLowerCase() === rewardTitle.toLowerCase(),
  );

  if (action) (dependencies.pressKey ?? pressKey)(action.key, action.description);
  else {
    console.log("  [INFO] Reward not configured. Add it to settings.json:");
    console.log(`  { "rewardTitle": "${rewardTitle}", "key": "Q", "description": "..." }`);
  }
}

/**
 * Opens the Twitch PubSub socket and listens for channel point redemptions.
 *
 * @param channelId Numeric Twitch broadcaster channel ID.
 * @param token Broadcaster OAuth token without the oauth: prefix.
 * @returns Nothing.
 */
export function connectPubSub(
  channelId: string,
  token: string,
  dependencies: PubSubDependencies = {},
): void {
  openPubSubConnection(channelId, token, dependencies, 0);
}

function openPubSubConnection(
  channelId: string,
  token: string,
  dependencies: PubSubDependencies,
  reconnectAttempt: number,
): void {
  const url = "wss://pubsub-edge.twitch.tv";
  const ws = dependencies.createWebSocket?.(url) ?? new WebSocket(url);
  const timers = dependencies.timers ?? defaultTimers;
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  let reconnectScheduled = false;

  ws.on("open", () => {
    ws.send(
      JSON.stringify({
        type: "LISTEN",
        data: {
          topics: [`channel-points-channel-v1.${channelId}`],
          auth_token: token,
        },
      }),
    );
    pingInterval = timers.setInterval(
      () => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "PING" }));
      },
      4 * 60 * 1000,
    ) as ReturnType<typeof setInterval>;
  });

  ws.on("message", (data) => {
    let message: unknown;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (!isRecord(message)) return;

    if (message.type === "RECONNECT") {
      ws.close();
      return;
    }

    if (message.type === "RESPONSE") {
      if (typeof message.error === "string" && message.error) {
        console.error(`[PUBSUB] Error: "${message.error}"`);
        if (message.error === "ERR_BADAUTH") {
          console.error("[PUBSUB] Invalid token or missing channel:read:redemptions scope.");
        }
      } else {
        console.log("[PUBSUB] Subscribed — listening for channel points...");
      }
      return;
    }

    if (
      message.type !== "MESSAGE" ||
      !isRecord(message.data) ||
      typeof message.data.message !== "string"
    ) {
      return;
    }

    let redemptionMessage: unknown;
    try {
      redemptionMessage = JSON.parse(message.data.message);
    } catch {
      return;
    }

    if (!isRecord(redemptionMessage) || redemptionMessage.type !== "reward-redeemed") return;
    if (!isRecord(redemptionMessage.data) || !isRecord(redemptionMessage.data.redemption)) return;

    const redemption = redemptionMessage.data.redemption;
    if (!isRecord(redemption.user) || !isRecord(redemption.reward)) return;

    const user = redemption.user.display_name;
    const title = redemption.reward.title;
    if (typeof user !== "string" || typeof title !== "string") return;

    const rewardId = typeof redemption.reward.id === "string" ? redemption.reward.id : null;
    handleChannelPointRedemption(user, title, rewardId, dependencies);
  });

  ws.on("close", () => {
    if (reconnectScheduled) return;
    reconnectScheduled = true;
    if (pingInterval !== undefined) timers.clearInterval(pingInterval);
    const reconnectDelay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    );
    console.warn(`[PUBSUB] Disconnected, reconnecting in ${reconnectDelay / 1000}s...`);
    timers.setTimeout(
      () => openPubSubConnection(channelId, token, dependencies, reconnectAttempt + 1),
      reconnectDelay,
    );
  });

  ws.on("error", (error) => {
    console.error("[PUBSUB] Connection error:", error.message);
  });
}
