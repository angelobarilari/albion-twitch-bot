import { Hardware } from "keysender";
import type { KeyboardButton } from "keysender";
import type { ActionContext } from "../../types/actions.js";
import { formatActionContext } from "../../utils/actionContext.js";
import settingsModule = require("../../settings.js");

const { settings } = settingsModule;
const GAME_WINDOW = "Albion";
type PressKeyAdapters = {
  now?: () => number;
  cooldownMs?: () => number;
  dryRun?: () => boolean;
  sendKey?: (key: string) => Promise<void>;
};

/**
 * Presses a configured key in the Albion window while respecting the global cooldown.
 *
 * @param key Key name accepted by keysender.
 * @param description Human-readable action description for the log.
 * @returns A promise that resolves after the key press attempt finishes.
 */
export function createPressKey(adapters: PressKeyAdapters = {}) {
  let lastActionTime = 0;
  const now = adapters.now ?? Date.now;
  const cooldownMs = adapters.cooldownMs ?? (() => settings.cooldownMs ?? 3000);
  const dryRun = adapters.dryRun ?? (() => settings.dryRun);
  const sendKey =
    adapters.sendKey ??
    (async (key: string) => {
      const sender = new Hardware(GAME_WINDOW);
      await sender.keyboard.sendKey(key.toLowerCase() as KeyboardButton);
    });

  return async function pressKey(
    key: string,
    description?: string,
    context?: ActionContext,
  ): Promise<void> {
    const currentTime = now();
    const cooldownDurationMs = cooldownMs();
    const contextLabel = formatActionContext(context);

    if (currentTime - lastActionTime < cooldownDurationMs) {
      console.log(
        `[COOLDOWN] Action blocked (${cooldownDurationMs / 1000}s between actions)${contextLabel}`,
      );
      return;
    }

    lastActionTime = currentTime;
    if (dryRun()) {
      console.log(
        `[DRY RUN] ${description ?? "Key action"} — would press ${key.toUpperCase()}${contextLabel}`,
      );
      return;
    }

    console.log(`[ACTION] ${description} — pressing ${key.toUpperCase()}${contextLabel}`);

    try {
      await sendKey(key.toLowerCase());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to press ${key.toUpperCase()}${contextLabel}:`, message);
      console.error(`Check that the "${GAME_WINDOW}" window is open.`);
    }
  };
}

export const pressKey = createPressKey();
