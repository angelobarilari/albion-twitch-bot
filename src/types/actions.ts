export type BitsAction = {
  bits: number;
  key: string;
  description?: string;
};

export type ChannelPointsAction = {
  rewardId?: string;
  rewardTitle?: string;
  key: string;
  description?: string;
};

export type TestCommand = {
  command: string;
  key: string;
};

export type MouseFreezeAction = {
  bits: number;
};

export type ActionContext = {
  source: "bits" | "channel-points" | "test-command";
  event: string;
  user: string;
};
