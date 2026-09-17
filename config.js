/**
 * Bot credentials. Never store real tokens in this file.
 * @type {{username: string, token: string}}
 */
module.exports = {
    username: process.env.TWITCH_BOT_USERNAME ?? "",
    token: process.env.TWITCH_BOT_TOKEN ?? "",
};
