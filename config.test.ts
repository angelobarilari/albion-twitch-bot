import assert from "node:assert/strict";
import test from "node:test";
import configModule = require("./config.js");

test("config reads credentials from an injected environment", () => {
  assert.deepEqual(
    configModule.createConfig({
      TWITCH_BOT_USERNAME: "test-bot",
      TWITCH_BOT_TOKEN: "test-token",
      TWITCH_BROADCASTER_TOKEN: "broadcaster-token",
    }),
    { username: "test-bot", token: "test-token", broadcasterToken: "broadcaster-token" },
  );
});

test("config defaults missing credentials to empty strings", () => {
  assert.deepEqual(configModule.createConfig({}), {
    username: "",
    token: "",
    broadcasterToken: "",
  });
});
