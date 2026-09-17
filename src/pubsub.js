const WebSocket = require("ws");
const { settings } = require("./settings");
const { pressKey } = require("./input");

/**
 * Finds the configured action for a reward and sends its key.
 * @param {string} user Display name of the redeemer.
 * @param {string} rewardTitle Reward title from Twitch.
 * @param {string|null} rewardId Reward ID, when available.
 * @returns {void}
 */
function handleChannelPointRedemption(user, rewardTitle, rewardId) {
    console.log(`\n[POINTS] ${user} redeemed "${rewardTitle}"`);

    const action = (settings.channelPointsActions ?? []).find(
        (a) =>
            a.rewardId === rewardId ||
            a.rewardTitle?.toLowerCase() === rewardTitle.toLowerCase(),
    );

    if (action) pressKey(action.key, action.description);
    else {
        console.log(
            `  [INFO] Reward not configured. Add it to settings.json:`,
        );
        console.log(
            `  { "rewardTitle": "${rewardTitle}", "key": "Q", "description": "..." }`,
        );
    }
}

/**
 * Opens the PubSub connection that receives channel point redemptions.
 * @param {string} channelId Numeric Twitch channel ID.
 * @param {string} token Token without the oauth: prefix.
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
                console.error(`[PUBSUB] Error: "${msg.error}"`);
                if (msg.error === "ERR_BADAUTH")
                    console.error(
                        "[PUBSUB] Invalid token or missing channel:read:redemptions scope.",
                    );
            } else
                console.log("[PUBSUB] Subscribed — listening for channel points...");

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
        console.warn("[PUBSUB] Disconnected, reconnecting in 5s...");
        setTimeout(() => connectPubSub(channelId, token), 5000);
    });

    ws.on("error", (err) => {
        console.error("[PUBSUB] Connection error:", err.message);
    });
}

module.exports = { connectPubSub, handleChannelPointRedemption };
