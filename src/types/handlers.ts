import type { Settings } from "./settings.js";
import type { ActionContext } from "./actions.js";

type InputActions = {
  pressKey: (key: string, description?: string, context?: ActionContext) => unknown;
  blockMouse: (durationMs: number, context?: ActionContext) => void;
};

export type BitsHandlerActions = InputActions & {
  settings: Pick<Settings, "mouseFreezeActions" | "mouseFreezeDurationMs" | "bitsActions">;
};

export type MessageHandlerActions = InputActions & {
  settings: Settings;
  simulateBits: (bits: number, user: string) => void;
  handleChannelPointRedemption: (
    user: string,
    rewardTitle: string,
    rewardId: string | null,
    context?: ActionContext,
  ) => void;
};
