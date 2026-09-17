const { settings } = require("../settings");
const { pressKey, blockMouse } = require("../input");
const { handleChannelPointRedemption } = require("../pubsub");

/**
 * Registers test commands received in chat.
 * @param {{on: Function}} client tmi.js client.
 * @returns {void}
 */
function setupMessageHandler(client) {
    client.on("message", (channel, tags, message, self) => {
        if (self) return;
        const user = tags["display-name"] || tags.username || "someone";

        console.log(`[MSG] ${user}: ${message}`);
        if (!settings.testCommandsEnabled) return;

        const normalized = message.trim().toLowerCase();
        const freezeCommand = (settings.mouseFreezeCommand ?? "mousefreeze").toLowerCase();

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

module.exports = { setupMessageHandler };