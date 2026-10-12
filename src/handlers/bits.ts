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
  client.on("raw_message", (raw) => {
    if (!raw.raw || !raw.raw.includes("bits=")) return;

    const bitsMatch = raw.raw.match(/(?:^|;)bits=(\d+)/);
    if (!bitsMatch) return;

    const bits = Number.parseInt(bitsMatch[1], 10);
    if (!bits) return;

    const displayMatch = raw.raw.match(/display-name=([^;]+)/);
    const user = displayMatch ? displayMatch[1] : "someone";
    handleBitsAmount(bits, user, actions);
  });
}

/**
 * Applies the configured actions for a bits amount.
 *
 * @param bits Positive bits amount to map.
 * @param user Name of the user who triggered the amount.
 * @param actions Settings and input adapters used to execute the actions.
 * @param simulated Whether the amount came from a test command.
 * @returns Nothing.
 */
export function handleBitsAmount(
  bits: number,
  user: string,
  actions: BitsHandlerActions,
  simulated = false,
): void {
  if (!Number.isSafeInteger(bits) || bits <= 0) return;

  const { settings, pressKey, blockMouse } = actions;
  console.log(
    simulated
      ? `\n[TEST] Simulating ${bits} bits from ${user}.`
      : `\n[BITS] ${user} sent ${bits} bits.`,
  );

  const freezeAction = settings.mouseFreezeActions.find((action) => bits === action.bits);
  if (freezeAction) blockMouse(settings.mouseFreezeDurationMs);

  const action = settings.bitsActions.find((item) => bits === item.bits);
  if (action) pressKey(action.key, action.description);
  else console.log(`[INFO] ${bits} bits — no action configured for this amount`);
}
