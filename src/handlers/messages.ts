import type tmi from "tmi.js";
import type { MessageHandlerActions } from "../types/handlers.js";
import { formatActionContext } from "../utils/actionContext.js";

/**
 * Registers the chat listener for configured test commands.
 *
 * @param client Twitch client that emits chat messages.
 * @param actions Settings and side-effect functions used by the commands.
 * @returns Nothing.
 */
export function setupMessageHandler(client: tmi.Client, actions: MessageHandlerActions): void {
  const { settings, pressKey, blockMouse, simulateBits, handleChannelPointRedemption } = actions;

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
      const context = { source: "test-command" as const, event: freezeCommand, user };
      console.log(`[TEST] Simulating mouse freeze${formatActionContext(context)}`);
      blockMouse(settings.mouseFreezeDurationMs ?? 5000, context);
      return;
    }

    if (normalized.startsWith("points ")) {
      const rewardTitle = message.trim().slice(7).trim();
      if (rewardTitle) {
        const context = { source: "test-command" as const, event: "points", user };
        console.log(
          `[TEST] Simulating channel point redemption: ${JSON.stringify(rewardTitle)}${formatActionContext(context)}`,
        );
        handleChannelPointRedemption(user, rewardTitle, null, context);
      }
      return;
    }

    const bitsMatch = normalized.match(/^bits\s+(\d+)$/);
    if (bitsMatch) {
      const bits = Number.parseInt(bitsMatch[1], 10);
      if (!Number.isSafeInteger(bits) || bits <= 0) {
        console.log("[TEST] Bits amount must be a positive safe integer.");
      } else if (!settings.dryRun) {
        console.log("[TEST] Simulated bits require dryRun to be enabled in settings.json.");
      } else {
        simulateBits(bits, user);
      }
      return;
    }

    const match = (settings.testCommands ?? []).find(
      (command) => command.command.toLowerCase() === normalized,
    );
    if (match) {
      const context = { source: "test-command" as const, event: match.command, user };
      pressKey(match.key, `Command "${match.command}" from ${user} → ${match.key}`, context);
    }
  });
}
