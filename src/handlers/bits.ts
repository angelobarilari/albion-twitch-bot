import type tmi from "tmi.js";
import type { BitsHandlerActions } from "../types/handlers.js";

/**
 * Registers the Twitch IRC listener that maps cheer amounts to game actions.
 *
 * @param client Twitch client that emits IRC messages.
 * @param actions Settings and side-effect functions used to execute configured actions.
 * @returns Nothing.
 */
export function setupBitsHandler(client: tmi.Client, actions: BitsHandlerActions): void {
  const { settings, pressKey, blockMouse } = actions;

  client.on("raw_message", (raw) => {
    if (!raw.raw || !raw.raw.includes("bits=")) return;

    const bitsMatch = raw.raw.match(/(?:^|;)bits=(\d+)/);
    if (!bitsMatch) return;

    const bits = Number.parseInt(bitsMatch[1], 10);
    if (!bits) return;

    const displayMatch = raw.raw.match(/display-name=([^;]+)/);
    const user = displayMatch ? displayMatch[1] : "someone";
    console.log(`\n[BITS] ${user} sent ${bits} bits.`);

    const freezeAction = settings.mouseFreezeActions.find((action) => bits === action.bits);
    if (freezeAction) blockMouse(settings.mouseFreezeDurationMs);

    const action = settings.bitsActions.find((item) => bits === item.bits);
    if (action) pressKey(action.key, action.description);
    else console.log(`[INFO] ${bits} bits — no action configured for this amount`);
  });
}
