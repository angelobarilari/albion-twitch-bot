const tmi = require("tmi.js");
const config = require("./config");
const { settings, initSettings } = require("./src/settings");
const { setupChatHandlers } = require("./src/chatHandler");

initSettings();

const channel = settings.channel;

if (!channel) {
    console.error('[ERROR] No channel configured. Set "channel" in settings.json.');
    process.exit(1);
}

if (!config.username || !config.token) {
    console.error("[ERROR] Missing credentials. Set TWITCH_BOT_USERNAME and TWITCH_BOT_TOKEN.");
    process.exit(1);
}

const client = new tmi.Client({
    identity: {
        username: config.username,
        password: config.token,
    },
    channels: [channel],
});

setupChatHandlers(client);

client.connect().then(() => {
    console.log(`[BOT] Connected to channel: ${channel}`);
    console.log("");
    console.log("=".repeat(60));
    console.log("  !! WARNING !!");
    console.log("");
    console.log("  THIS BOT MUST RUN AS ADMINISTRATOR!");
    console.log("");
    console.log("  Right-click the executable or terminal");
    console.log('  and select "Run as administrator".');
    console.log("=".repeat(60));
}).catch((err) => {
    console.error("[ERROR] Could not connect:", err);
});
