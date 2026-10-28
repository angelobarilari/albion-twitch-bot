import type { BotConfig, ConfigEnvironment } from "./src/types/config.js";

function createConfig(environment: ConfigEnvironment): BotConfig {
  return {
    username: environment.TWITCH_BOT_USERNAME ?? "",
    token: environment.TWITCH_BOT_TOKEN ?? "",
    clientId: environment.TWITCH_CLIENT_ID ?? "",
    broadcasterToken: environment.TWITCH_BROADCASTER_TOKEN ?? "",
  };
}

const config = createConfig(process.env);

export = Object.assign(config, { createConfig });
