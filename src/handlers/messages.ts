import type tmi from "tmi.js";
import type { MessageHandlerActions } from "../types/handlers.js";

/**
 * Registers the chat listener for configured test commands.
 *
 * @param client Twitch client that emits chat messages.
 * @param actions Settings and side-effect functions used by the commands.
 * @returns Nothing.
 */
export function setupMessageHandler(client: tmi.Client, actions: MessageHandlerActions): void {
  const { settings, pressKey, blockMouse, handleChannelPointRedemption } = actions;

  client.on("message", (_channel, tags, message, self) => {
    if (self) return;
    const user = tags["display-name"] || tags.username || "someone";

    console.log(`[MSG] Message received from ${user}.`);
    if (!settings.testCommandsEnabled) return;
    const isModerator = tags.mod === true || tags["user-type"] === "mod";
    const isBroadcaster = tags.badges?.broadcaster === "1";
    if (!isModerator && !isBroadcaster) return;

    const normalized = message.trim().toLowerCase();
    const freezeCommand = settings.testMouseFreezeCommand.toLowerCase();

    if (normalized === freezeCommand) {
      console.log("[TEST] Simulating mouse freeze");
      blockMouse(settings.mouseFreezeDurationMs ?? 5000);
      return;
    }

    if (normalized.startsWith("points ")) {
      const rewardTitle = message.trim().slice(7).trim();
      if (rewardTitle) {
        console.log(`[TEST] Simulating channel point redemption: "${rewardTitle}"`);
        handleChannelPointRedemption(user, rewardTitle, null);
      }
      return;
    }

    const match = (settings.testCommands ?? []).find(
      (command) => command.command.toLowerCase() === normalized,
    );
    if (match) pressKey(match.key, `Command "${match.command}" from ${user} → ${match.key}`);
  });
}
