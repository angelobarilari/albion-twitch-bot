const { Hardware } = require("keysender");
const koffi = require("koffi");
const { settings } = require("./settings");

const GAME_WINDOW = "Albion";
let lastActionTime = 0;

const user32 = koffi.load("user32.dll");
const BlockInput = user32.func("bool BlockInput(bool fBlockIt)");

/**
 * Blocks mouse and keyboard input for a period using the Windows API.
 * @param {number} durationMs Block duration in milliseconds.
 * @returns {void}
 */
function blockMouse(durationMs) {
    const ok = BlockInput(true);
    if (!ok) {
        console.log("[FREEZE] BlockInput failed — try running the bot as administrator");
        return;
    }
    console.log(`[FREEZE] Input blocked for ${durationMs / 1000}s`);
    setTimeout(() => {
        BlockInput(false);
        console.log("[FREEZE] Input unblocked");
    }, durationMs);
}

async function pressKey(key, description) {
    const now = Date.now();

    const cooldownMs = settings.cooldownMs ?? 3000;
    if (now - lastActionTime < cooldownMs) {
        console.log(`[COOLDOWN] Action blocked (${cooldownMs / 1000}s between actions)`);
        return;
    }

    lastActionTime = now;
    console.log(`[ACTION] ${description} — pressing ${key.toUpperCase()}`);

    try {
        const sender = new Hardware(GAME_WINDOW);
        await sender.keyboard.sendKey(key.toLowerCase());
    } catch (err) {
        console.error(`[ERROR] Failed to press ${key.toUpperCase()}:`, err.message);
        console.error(`Check that the "${GAME_WINDOW}" window is open.`);
    }
}

module.exports = { blockMouse, pressKey };
