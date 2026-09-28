import type tmi from "tmi.js";
import { connectPubSub, handleChannelPointRedemption } from "./services/twitch/pubsub.js";
import { blockMouse, pressKey } from "./services/input/index.js";
import { setupBitsHandler } from "./handlers/bits.js";
import { setupMessageHandler } from "./handlers/messages.js";
import config = require("../config.js");
import settingsModule = require("./settings.js");

const { settings } = settingsModule;

/**
 * Connects application handlers and lifecycle events to the Twitch client.
 *
 * @param client Twitch client used to receive chat and connection events.
 * @returns Nothing.
 */
export function setupChatHandlers(client: tmi.Client): void {
  let pubSubConnected = false;

  setupBitsHandler(client, { settings, pressKey, blockMouse });
  setupMessageHandler(client, { settings, pressKey, blockMouse, handleChannelPointRedemption });

  client.on("roomstate", (_channel, tags) => {
    if (pubSubConnected) return;
    const channelId = tags["room-id"];
    if (!channelId) return;

    const token = config.broadcasterToken.trim().replace(/^oauth:/, "");
    if (!token) {
      console.log("[PUBSUB] broadcasterToken is not configured — channel points are disabled.");
      console.log("[PUBSUB] Ask the streamer to fill in broadcasterToken in settings.json.");
      return;
    }

    pubSubConnected = true;
    connectPubSub(channelId, token);
  });

  client.on("connected", (_address, port) => {
    console.log(`[OK] Connected to channel #${settings.channel} on port ${port}`);
    console.log("");
    console.log("=== BIT ACTIONS ===");
    settings.bitsActions.forEach((action) => {
      console.log(`  ${action.bits} bits → key ${action.key} (${action.description})`);
    });

    console.log("");
    console.log("=== CHANNEL POINT ACTIONS ===");
    const channelPointActions = settings.channelPointsActions ?? [];
    if (channelPointActions.length > 0) {
      channelPointActions.forEach((action) => {
        const label = action.rewardTitle ?? action.rewardId;
        console.log(`  "${label}" → key ${action.key} (${action.description})`);
      });
    } else {
      console.log("  None configured.");
    }

    const token = config.broadcasterToken.trim();
    if (!token)
      console.log("  [WARNING] broadcasterToken is empty — channel points will not work.");

    console.log("");
    if (settings.testCommandsEnabled) {
      console.log("=== TEST COMMANDS ===");
      settings.testCommands.forEach((command) => {
        console.log(`  "${command.command}" → key ${command.key}`);
      });
      console.log('  "points <name>" → simulates a channel point redemption');
      console.log(
        `  "${settings.testMouseFreezeCommand}" → simulates a mouse freeze for ${settings.mouseFreezeDurationMs / 1000}s`,
      );
      console.log("");
      console.log(
        "[WARNING] Test mode ENABLED — disable it in settings.json when no longer needed.",
      );
      console.log(
        "[WARNING] Albion's default Overcharge shortcut is SHIFT+O. Change it from 'O' or it will not work.",
      );
    } else {
      console.log("[INFO] Test commands DISABLED.");
    }

    console.log("");
    console.log("[OK] Waiting for bits, channel points, and messages...");
  });

  client.on("disconnected", (reason) => {
    console.warn("[DISCONNECTED]", reason);
    console.log("[INFO] tmi.js will reconnect automatically.");
  });
}
