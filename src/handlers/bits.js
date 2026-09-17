const { settings } = require("../settings");
const { pressKey, blockMouse } = require("../input");

/**
 * Registra o tratamento de mensagens IRC que contêm bits.
 * @param {{on: Function}} client Cliente tmi.js.
 * @returns {void}
 */
function setupBitsHandler(client) {
    client.on("raw_message", (raw) => {
        if (!raw.raw || !raw.raw.includes("bits=")) return;

        const bitsMatch = raw.raw.match(/(?:^|;)bits=(\d+)/);
        if (!bitsMatch) return;

        const bits = parseInt(bitsMatch[1], 10);
        if (!bits) return;

        const displayMatch = raw.raw.match(/display-name=([^;]+)/);
        const user = displayMatch ? displayMatch[1] : "alguém";
        const msgMatch = raw.raw.match(/PRIVMSG #\S+ :(.+)$/);
        const message = msgMatch ? msgMatch[1] : "";

        console.log(`\n[BITS] ${user} enviou ${bits} bits: "${message}"`);

        const freezeAction = (settings.mouseFreezeActions ?? []).find((action) => bits === action.bits);
        if (freezeAction) blockMouse(settings.mouseFreezeDurationMs ?? 5000);

        const action = (settings.bitsActions ?? []).find((item) => bits === item.bits);
        if (action) pressKey(action.key, action.description);
        else console.log(`[INFO] ${bits} bits — nenhuma ação configurada para essa quantidade`);
    });
}

module.exports = { setupBitsHandler };