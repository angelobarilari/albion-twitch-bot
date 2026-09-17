/**
 * Credenciais do bot. Nunca coloque tokens reais neste arquivo.
 * @type {{username: string, token: string}}
 */
module.exports = {
    username: process.env.TWITCH_BOT_USERNAME ?? "",
    token: process.env.TWITCH_BOT_TOKEN ?? "",
};
