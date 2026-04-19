import { create } from "zustand";

export type StaffAlertChannel = "approval" | "orderRequest" | "ordersStatus";

type ChannelState = {
  lastSeen: number;
  primed: boolean;
};

type StaffAlertsState = {
  approval: ChannelState;
  orderRequest: ChannelState;
  ordersStatus: ChannelState;
  /** Local notifications + default sound when new activity is detected */
  alertSoundEnabled: boolean;
  setAlertSoundEnabled: (enabled: boolean) => void;
  reset: () => void;
  /** Internal: trim baseline when queue shrinks without a visit */
  trimChannel: (channel: StaffAlertChannel, currentCount: number) => void;
  primeChannel: (channel: StaffAlertChannel, currentCount: number) => void;
  syncWhileViewing: (channel: StaffAlertChannel, currentCount: number) => void;
};

const initialChannel = (): ChannelState => ({ lastSeen: 0, primed: false });

const initialState = {
  approval: initialChannel(),
  orderRequest: initialChannel(),
  ordersStatus: initialChannel(),
  alertSoundEnabled: true,
};

export const useStaffAlertsStore = create<StaffAlertsState>((set) => ({
  ...initialState,

  setAlertSoundEnabled: (enabled) => set({ alertSoundEnabled: enabled }),

  trimChannel: (channel, currentCount) =>
    set((s) => {
      const c = s[channel];
      if (!c.primed) return s;
      if (currentCount >= c.lastSeen) return s;
      return { [channel]: { ...c, lastSeen: currentCount } };
    }),

  primeChannel: (channel, currentCount) =>
    set((s) => {
      const c = s[channel];
      if (c.primed) return s;
      return { [channel]: { lastSeen: currentCount, primed: true } };
    }),

  syncWhileViewing: (channel, currentCount) =>
    set((s) => ({
      [channel]: { lastSeen: currentCount, primed: true },
    })),

  reset: () => set({ ...initialState }),
}));
