import { create } from 'zustand';

const usePayoutStore = create((set) => ({
  payouts: [],
  livePayoutEvent: null,
  totalProtected: 0,

  setPayouts: (payouts) => {
    const total = payouts.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
    set({ payouts, totalProtected: total });
  },
  
  setLivePayoutEvent: (event) => set({ livePayoutEvent: event }),
  clearLiveEvent: () => set({ livePayoutEvent: null })
}));

export default usePayoutStore;
