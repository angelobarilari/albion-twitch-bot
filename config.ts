type BotConfig = {
  username: string;
  token: string;
  broadcasterToken: string;
};

type ConfigEnvironment = {
  [key: string]: string | undefined;
  TWITCH_BOT_USERNAME?: string;
  TWITCH_BOT_TOKEN?: string;
  TWITCH_BROADCASTER_TOKEN?: string;
};

function createConfig(environment: ConfigEnvironment): BotConfig {
  return {
    username: environment.TWITCH_BOT_USERNAME ?? "",
    token: environment.TWITCH_BOT_TOKEN ?? "",
    broadcasterToken: environment.TWITCH_BROADCASTER_TOKEN ?? "",
  };
}

const config = createConfig(process.env);

export = Object.assign(config, { createConfig });
