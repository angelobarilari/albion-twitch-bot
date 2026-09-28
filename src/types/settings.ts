import type { BitsAction, ChannelPointsAction, MouseFreezeAction, TestCommand } from "./actions.js";

export type Settings = {
  channel: string;
  cooldownMs: number;
  mouseFreezeDurationMs: number;
  mouseFreezeCooldownMs: number;
  mouseFreezeActions: MouseFreezeAction[];
  testCommandsEnabled: boolean;
  testMouseFreezeCommand: string;
  testCommands: TestCommand[];
  bitsActions: BitsAction[];
  channelPointsActions: ChannelPointsAction[];
};
