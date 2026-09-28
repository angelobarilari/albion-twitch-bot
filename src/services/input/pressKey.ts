import { Hardware } from "keysender";
import type { KeyboardButton } from "keysender";
import settingsModule = require("../../settings.js");

const { settings } = settingsModule;
const GAME_WINDOW = "Albion";
type PressKeyAdapters = {
  now?: () => number;
  cooldownMs?: () => number;
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
  const sendKey =
    adapters.sendKey ??
    (async (key: string) => {
      const sender = new Hardware(GAME_WINDOW);
      await sender.keyboard.sendKey(key.toLowerCase() as KeyboardButton);
    });

  return async function pressKey(key: string, description?: string): Promise<void> {
    const currentTime = now();
    const cooldownDurationMs = cooldownMs();

    if (currentTime - lastActionTime < cooldownDurationMs) {
      console.log(`[COOLDOWN] Action blocked (${cooldownDurationMs / 1000}s between actions)`);
      return;
    }

    lastActionTime = currentTime;
    console.log(`[ACTION] ${description} — pressing ${key.toUpperCase()}`);

    try {
      await sendKey(key.toLowerCase());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to press ${key.toUpperCase()}:`, message);
      console.error(`Check that the "${GAME_WINDOW}" window is open.`);
    }
  };
}

export const pressKey = createPressKey();
