const { settings } = require("../settings");
const { pressKey, blockMouse } = require("../input");
const { handleChannelPointRedemption } = require("../pubsub");

/**
 * Registra comandos de teste recebidos no chat.
 * @param {{on: Function}} client Cliente tmi.js.
 * @returns {void}
 */
function setupMessageHandler(client) {
    client.on("message", (channel, tags, message, self) => {
        if (self) return;
        const user = tags["display-name"] || tags.username || "alguém";

        console.log(`[MSG] ${user}: ${message}`);
        if (!settings.testCommandsEnabled) return;

        const normalized = message.trim().toLowerCase();
        const freezeCommand = (settings.mouseFreezeCommand ?? "mousefreeze").toLowerCase();

        if (normalized === freezeCommand) {
            console.log("[TESTE] Simulando freeze do mouse");
            blockMouse(settings.mouseFreezeDurationMs ?? 5000);
            return;
        }

        if (normalized.startsWith("pontos ")) {
            const rewardTitle = message.trim().slice(7).trim();
            if (rewardTitle) {
                console.log(`[TESTE] Simulando resgate de pontos: "${rewardTitle}"`);
                handleChannelPointRedemption(user, rewardTitle, null);
            }
            return;
        }

        const match = (settings.testCommands ?? []).find(
            (command) => command.command.toLowerCase() === normalized,
        );
        if (match) pressKey(match.key, `Comando "${match.command}" por ${user} → ${match.key}`);
    });
}

module.exports = { setupMessageHandler };