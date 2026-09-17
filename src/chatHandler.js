const { settings } = require("./settings");
const { connectPubSub } = require("./pubsub");
const { setupBitsHandler } = require("./handlers/bits");
const { setupMessageHandler } = require("./handlers/messages");

/**
 * Registers all bot listeners on the Twitch client.
 * @param {{on: Function, connect: Function}} client tmi.js client.
 * @returns {void}
 */
function setupChatHandlers(client) {
    let pubSubConnected = false;

    setupBitsHandler(client);
    setupMessageHandler(client);

    client.on("roomstate", (channel, tags) => {
        if (pubSubConnected) return;
        const channelId = tags["room-id"];
        if (!channelId) return;

        const token = (settings.broadcasterToken ?? "").trim().replace(/^oauth:/, "");
        if (!token) {
            console.log("[PUBSUB] broadcasterToken is not configured — channel points are disabled.");
            console.log("[PUBSUB] Ask the streamer to fill in broadcasterToken in settings.json.");
            return;
        }

        pubSubConnected = true;
        connectPubSub(channelId, token);
    });

    client.on("connected", () => {
        console.log(`[OK] Connected to channel #${settings.channel}`);
        console.log("");
        console.log("=== BIT ACTIONS ===");
        settings.bitsActions.forEach((a) => {
            console.log(`  ${a.bits} bits → key ${a.key} (${a.description})`);
        });

        console.log("");
        console.log("=== CHANNEL POINT ACTIONS ===");
        const cpActions = settings.channelPointsActions ?? [];
        if (cpActions.length > 0)
            cpActions.forEach((a) => {
                const label = a.rewardTitle ?? a.rewardId;
                console.log(`  "${label}" → key ${a.key} (${a.description})`);
            });
        else console.log("  None configured.");

        const token = (settings.broadcasterToken ?? "").trim();
        if (!token)
            console.log("  [WARNING] broadcasterToken is empty — channel points will not work.");

        console.log("");
        if (settings.testCommandsEnabled) {
            console.log("=== TEST COMMANDS ===");
            settings.testCommands.forEach((cmd) => {
                console.log(`  "${cmd.command}" → key ${cmd.key}`);
            });
            console.log(`  "points <name>" → simulates a channel point redemption`);
            console.log(`  "${settings.mouseFreezeCommand ?? "mousefreeze"}" → simulates a mouse freeze for ${(settings.mouseFreezeDurationMs ?? 5000) / 1000}s`);
            console.log("");
            console.log("[WARNING] Test mode ENABLED — disable it in settings.json when no longer needed.");
            console.log("[WARNING] Albion's default Overcharge shortcut is SHIFT+O. Change it from 'O' or it will not work.");
        } else {
            console.log("[INFO] Test commands DISABLED.");
        }

        console.log("");
        console.log("[OK] Waiting for bits, channel points, and messages...");
    });

    client.on("disconnected", (reason) => {
        console.warn("[DISCONNECTED]", reason);
        console.log("Reconnecting in 5s...");
        setTimeout(() => client.connect(), 5000);
    });
}

module.exports = { setupChatHandlers };
