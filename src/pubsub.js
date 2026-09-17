const WebSocket = require("ws");
const { settings } = require("./settings");
const { pressKey } = require("./input");

/**
 * Procura a ação configurada para uma recompensa e envia sua tecla.
 * @param {string} user Nome de exibição de quem resgatou.
 * @param {string} rewardTitle Título da recompensa na Twitch.
 * @param {string|null} rewardId ID da recompensa, quando disponível.
 * @returns {void}
 */
function handleChannelPointRedemption(user, rewardTitle, rewardId) {
    console.log(`\n[PONTOS] ${user} resgatou "${rewardTitle}"`);

    const action = (settings.channelPointsActions ?? []).find(
        (a) =>
            a.rewardId === rewardId ||
            a.rewardTitle?.toLowerCase() === rewardTitle.toLowerCase(),
    );

    if (action) pressKey(action.key, action.description);
    else {
        console.log(
            `  [INFO] Recompensa não configurada. Adicione em settings.json:`,
        );
        console.log(
            `  { "rewardTitle": "${rewardTitle}", "key": "Q", "description": "..." }`,
        );
    }
}

/**
 * Abre a conexão PubSub que recebe resgates de pontos do canal.
 * @param {string} channelId ID numérico do canal na Twitch.
 * @param {string} token Token sem o prefixo oauth:.
 * @returns {void}
 */
function connectPubSub(channelId, token) {
    const ws = new WebSocket("wss://pubsub-edge.twitch.tv");
    let pingInterval;

    ws.on("open", () => {
        ws.send(
            JSON.stringify({
                type: "LISTEN",
                data: {
                    topics: [`channel-points-channel-v1.${channelId}`],
                    auth_token: token,
                },
            }),
        );
        pingInterval = setInterval(
            () => {
                if (ws.readyState === WebSocket.OPEN)
                    ws.send(JSON.stringify({ type: "PING" }));
            },
            4 * 60 * 1000,
        );
    });

    ws.on("message", (data) => {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch {
            return;
        }

        if (msg.type === "RECONNECT") {
            ws.close();
            return;
        }

        if (msg.type === "RESPONSE") {
            if (msg.error) {
                console.error(`[PUBSUB] Erro: "${msg.error}"`);
                if (msg.error === "ERR_BADAUTH")
                    console.error(
                        "[PUBSUB] Token inválido ou sem o escopo channel:read:redemptions.",
                    );
            } else
                console.log("[PUBSUB] Inscrito — ouvindo pontos do canal...");

            return;
        }

        if (msg.type !== "MESSAGE") return;

        let inner;
        try {
            inner = JSON.parse(msg.data.message);
        } catch {
            return;
        }

        if (inner.type === "reward-redeemed") {
            const r = inner.data.redemption;
            handleChannelPointRedemption(
                r.user.display_name,
                r.reward.title,
                r.reward.id,
            );
        }
    });

    ws.on("close", () => {
        clearInterval(pingInterval);
        console.warn("[PUBSUB] Desconectado, reconectando em 5s...");
        setTimeout(() => connectPubSub(channelId, token), 5000);
    });

    ws.on("error", (err) => {
        console.error("[PUBSUB] Erro de conexão:", err.message);
    });
}

module.exports = { connectPubSub, handleChannelPointRedemption };
