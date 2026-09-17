const { settings } = require("./settings");
const { connectPubSub } = require("./pubsub");
const { setupBitsHandler } = require("./handlers/bits");
const { setupMessageHandler } = require("./handlers/messages");

/**
 * Registra todos os listeners do bot no cliente da Twitch.
 * @param {{on: Function, connect: Function}} client Cliente tmi.js.
 * @returns {void}
 */
function setupChatHandlers(client) {
    let pubSubConnected = false;

    setupBitsHandler(client);
    setupMessageHandler(client);

    client.on("roomstate", (channel, tags) => {
        if (pubSubConnected) return;
        const channelId = tags["room-id"];
        if (!channelId) return;

        const token = (settings.broadcasterToken ?? "").trim().replace(/^oauth:/, "");
        if (!token) {
            console.log("[PUBSUB] broadcasterToken não configurado — pontos do canal desativados.");
            console.log("[PUBSUB] Peça ao streamer para preencher o campo broadcasterToken no settings.json.");
            return;
        }

        pubSubConnected = true;
        connectPubSub(channelId, token);
    });

    client.on("connected", () => {
        console.log(`[OK] Conectado ao canal #${settings.channel}`);
        console.log("");
        console.log("=== AÇÕES DE BITS ===");
        settings.bitsActions.forEach((a) => {
            console.log(`  ${a.bits} bits → tecla ${a.key} (${a.description})`);
        });

        console.log("");
        console.log("=== AÇÕES DE PONTOS DO CANAL ===");
        const cpActions = settings.channelPointsActions ?? [];
        if (cpActions.length > 0)
            cpActions.forEach((a) => {
                const label = a.rewardTitle ?? a.rewardId;
                console.log(`  "${label}" → tecla ${a.key} (${a.description})`);
            });
        else console.log("  Nenhuma configurada.");

        const token = (settings.broadcasterToken ?? "").trim();
        if (!token)
            console.log("  [AVISO] broadcasterToken vazio — pontos do canal não funcionarão.");

        console.log("");
        if (settings.testCommandsEnabled) {
            console.log("=== COMANDOS DE TESTE ===");
            settings.testCommands.forEach((cmd) => {
                console.log(`  "${cmd.command}" → tecla ${cmd.key}`);
            });
            console.log(`  "pontos <nome>" → simula resgate de pontos do canal`);
            console.log(`  "${settings.mouseFreezeCommand ?? "mousefreeze"}" → simula freeze do mouse por ${(settings.mouseFreezeDurationMs ?? 5000) / 1000}s`);
            console.log("");
            console.log("[AVISO] Modo de teste ATIVADO — desative em settings.json quando não precisar mais.");
            console.log("[AVISO] Overcharge no Albion o padrão é SHIFT+O, mude para apenas 'O' (ou tecla da sua escolha) ou não irá funcionar.");
        } else {
            console.log("[INFO] Comandos de teste DESATIVADOS.");
        }

        console.log("");
        console.log("[OK] Aguardando bits, pontos do canal e mensagens...");
    });

    client.on("disconnected", (reason) => {
        console.warn("[DESCONECTADO]", reason);
        console.log("Reconectando em 5s...");
        setTimeout(() => client.connect(), 5000);
    });
}

module.exports = { setupChatHandlers };
