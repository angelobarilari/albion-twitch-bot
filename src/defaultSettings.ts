import type { Settings } from "./types/settings.js";

const defaultSettings: Settings = {
  channel: "",
  cooldownMs: 3000,
  mouseFreezeDurationMs: 5000,
  mouseFreezeCooldownMs: 30_000,
  mouseFreezeActions: [{ bits: 100 }],
  testCommandsEnabled: false,
  testMouseFreezeCommand: "mousefreeze",
  testCommands: [
    { command: "dismount", key: "A" },
    { command: "press q", key: "Q" },
    { command: "press w", key: "W" },
    { command: "press e", key: "E" },
    { command: "press armor", key: "R" },
    { command: "press helmet", key: "D" },
    { command: "press boots", key: "F" },
    { command: "press potion", key: "1" },
    { command: "press food", key: "2" },
    { command: "use overcharge", key: "O" },
  ],
  bitsActions: [
    { bits: 1, key: "A", description: "Dismount" },
    { bits: 2, key: "Q", description: "Q Ability" },
    { bits: 3, key: "W", description: "W Ability" },
    { bits: 4, key: "E", description: "E Ability" },
    { bits: 5, key: "R", description: "Armor" },
    { bits: 6, key: "D", description: "Helmet" },
    { bits: 7, key: "F", description: "Boots" },
    { bits: 8, key: "1", description: "Potion" },
    { bits: 9, key: "2", description: "Food" },
    { bits: 10, key: "O", description: "Overcharge" },
  ],
  channelPointsActions: [
    { rewardTitle: "Q Ability", key: "Q", description: "Q Ability" },
    { rewardTitle: "W Ability", key: "W", description: "W Ability" },
    { rewardTitle: "E Ability", key: "E", description: "E Ability" },
  ],
};

export = { defaultSettings };
