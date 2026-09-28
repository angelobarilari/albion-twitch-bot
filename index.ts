import tmi from "tmi.js";
import config = require("./config.js");
import settingsModule = require("./src/settings.js");
import { setupChatHandlers } from "./src/chatHandler.js";

const { settings, initSettings } = settingsModule;

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

if (settings.channelPointsActions.length > 0 && !config.broadcasterToken) {
  console.warn(
    "[WARNING] Channel point actions are configured, but TWITCH_BROADCASTER_TOKEN is missing.",
  );
}

const client = new tmi.Client({
  connection: { reconnect: true },
  identity: {
    username: config.username,
    password: config.token,
  },
  channels: [channel],
});

setupChatHandlers(client);

client
  .connect()
  .then(() => {
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
  })
  .catch((error: unknown) => {
    console.error("[ERROR] Could not connect:", error);
  });
