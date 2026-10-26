export type BotConfig = {
  username: string;
  token: string;
  broadcasterToken: string;
};

export type ConfigEnvironment = {
  [key: string]: string | undefined;
  TWITCH_BOT_USERNAME?: string;
  TWITCH_BOT_TOKEN?: string;
  TWITCH_BROADCASTER_TOKEN?: string;
};
