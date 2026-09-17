const { Hardware } = require("keysender");
const koffi = require("koffi");
const { settings } = require("./settings");

const GAME_WINDOW = "Albion";
let lastActionTime = 0;

const user32 = koffi.load("user32.dll");
const BlockInput = user32.func("bool BlockInput(bool fBlockIt)");

/**
 * Bloqueia mouse e teclado por um período usando a API do Windows.
 * @param {number} durationMs Duração do bloqueio em milissegundos.
 * @returns {void}
 */
function blockMouse(durationMs) {
    const ok = BlockInput(true);
    if (!ok) {
        console.log("[FREEZE] BlockInput falhou — tente rodar o bot como administrador");
        return;
    }
    console.log(`[FREEZE] Input bloqueado por ${durationMs / 1000}s`);
    setTimeout(() => {
        BlockInput(false);
        console.log("[FREEZE] Input desbloqueado");
    }, durationMs);
}

async function pressKey(key, description) {
    const now = Date.now();

    const cooldownMs = settings.cooldownMs ?? 3000;
    if (now - lastActionTime < cooldownMs) {
        console.log(`[COOLDOWN] Ação bloqueada (${cooldownMs / 1000}s entre ações)`);
        return;
    }

    lastActionTime = now;
    console.log(`[ACAO] ${description} — pressionando ${key.toUpperCase()}`);

    try {
        const sender = new Hardware(GAME_WINDOW);
        await sender.keyboard.sendKey(key.toLowerCase());
    } catch (err) {
        console.error(`[ERRO] Falha ao pressionar ${key.toUpperCase()}:`, err.message);
        console.error(`Verifique se a janela "${GAME_WINDOW}" está aberta.`);
    }
}

module.exports = { blockMouse, pressKey };
