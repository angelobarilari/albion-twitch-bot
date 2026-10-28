import type tmi from "tmi.js";
import { connectEventSub, handleChannelPointRedemption } from "./services/twitch/eventsub.js";
import { blockMouse, pressKey } from "./services/input/index.js";
import { handleBitsAmount, setupBitsHandler } from "./handlers/bits.js";
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
  let eventSubStarted = false;

  const bitsActions = { settings, pressKey, blockMouse };
  setupBitsHandler(client, bitsActions);
  setupMessageHandler(client, {
    settings,
    pressKey,
    blockMouse,
    simulateBits: (bits, user) => handleBitsAmount(bits, user, bitsActions, true),
    handleChannelPointRedemption: (user, rewardTitle, rewardId, context) =>
      handleChannelPointRedemption(user, rewardTitle, rewardId, {}, context),
  });

  client.on("roomstate", (_channel, tags) => {
    if (eventSubStarted || settings.channelPointsActions.length === 0) return;
    const channelId = tags["room-id"];
    if (!channelId) return;

    const token = config.broadcasterToken.trim().replace(/^oauth:/, "");
    if (!config.clientId.trim() || !token) {
      console.log(
        "[EVENTSUB] Channel points are disabled. Set TWITCH_CLIENT_ID and TWITCH_BROADCASTER_TOKEN.",
      );
      return;
    }

    eventSubStarted = true;
    connectEventSub(channelId, config.clientId.trim(), token);
  });

  client.on("connected", (_address, port) => {
    console.log(`[OK] Connected to channel #${settings.channel} on port ${port}`);
    console.log(`[INFO] Dry run ${settings.dryRun ? "ENABLED" : "disabled"}.`);
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

    if (settings.channelPointsActions.length > 0) {
      if (!config.clientId.trim())
        console.log("  [WARNING] TWITCH_CLIENT_ID is empty — channel points will not work.");
      if (!config.broadcasterToken.trim())
        console.log(
          "  [WARNING] TWITCH_BROADCASTER_TOKEN is empty — channel points will not work.",
        );
    }

    console.log("");
    if (settings.testCommandsEnabled) {
      console.log("=== TEST COMMANDS ===");
      settings.testCommands.forEach((command) => {
        console.log(`  "${command.command}" → key ${command.key}`);
      });
      console.log('  "bits <amount>" → simulates a bits event (requires dryRun)');
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
