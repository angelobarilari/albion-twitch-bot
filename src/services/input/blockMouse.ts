import koffi = require("koffi");
import type { ActionContext } from "../../types/actions.js";
import { formatActionContext } from "../../utils/actionContext.js";
import settingsModule = require("../../settings.js");

const { settings } = settingsModule;

type BlockMouseAdapters = {
  blockInput: (blocked: boolean) => boolean;
  now?: () => number;
  cooldownMs?: () => number;
  dryRun?: () => boolean;
  setTimeout?: (callback: () => void, delayMs: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
};

/**
 * Creates an input blocker with injectable native and timer adapters.
 *
 * @param adapters Native input and timer implementations.
 * @returns A function that blocks input for the requested duration.
 */
export function createBlockMouse(adapters: BlockMouseAdapters) {
  const scheduleTimeout = adapters.setTimeout ?? setTimeout;
  const cancelTimeout =
    adapters.clearTimeout ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const now = adapters.now ?? Date.now;
  const cooldownMs = adapters.cooldownMs ?? (() => settings.mouseFreezeCooldownMs);
  const dryRun = adapters.dryRun ?? (() => settings.dryRun);
  let unblockTimer: unknown;
  let blockGeneration = 0;
  let lastBlockTime = Number.NEGATIVE_INFINITY;

  return function blockMouse(durationMs: number, context?: ActionContext): void {
    const currentTime = now();
    const contextLabel = formatActionContext(context);
    if (currentTime - lastBlockTime < cooldownMs()) {
      console.log(`[COOLDOWN] Input freeze request ignored.${contextLabel}`);
      return;
    }

    if (dryRun()) {
      lastBlockTime = currentTime;
      console.log(`[DRY RUN] Would block input for ${durationMs / 1000}s${contextLabel}`);
      return;
    }

    const succeeded = adapters.blockInput(true);
    if (!succeeded) {
      console.log(
        `[FREEZE] BlockInput failed — try running the bot as administrator${contextLabel}`,
      );
      return;
    }
    lastBlockTime = currentTime;
    if (unblockTimer !== undefined) cancelTimeout(unblockTimer);
    const currentGeneration = ++blockGeneration;
    console.log(`[FREEZE] Input blocked for ${durationMs / 1000}s${contextLabel}`);
    unblockTimer = scheduleTimeout(() => {
      if (currentGeneration !== blockGeneration) return;
      unblockTimer = undefined;
      adapters.blockInput(false);
      console.log(`[FREEZE] Input unblocked${contextLabel}`);
    }, durationMs);
  };
}

let nativeBlockInput: ((blocked: boolean) => boolean) | undefined;

function callNativeBlockInput(blocked: boolean): boolean {
  if (!nativeBlockInput) {
    const user32 = koffi.load("user32.dll");
    nativeBlockInput = user32.func("bool BlockInput(bool fBlockIt)");
  }
  return nativeBlockInput(blocked);
}

/**
 * Blocks local mouse and keyboard input for the requested duration.
 *
 * @param durationMs How long input remains blocked, in milliseconds.
 * @returns Nothing.
 */
export const blockMouse = createBlockMouse({ blockInput: callNativeBlockInput });
