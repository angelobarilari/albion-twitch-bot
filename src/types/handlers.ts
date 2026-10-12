import type { Settings } from "./settings.js";

type InputActions = {
  pressKey: (key: string, description?: string) => unknown;
  blockMouse: (durationMs: number) => void;
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
  ) => void;
};
