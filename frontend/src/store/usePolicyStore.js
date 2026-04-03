import { create } from 'zustand';

const usePolicyStore = create((set) => ({
  activePolicy: null,
  plans: null,
  loading: false,

  setActivePolicy: (policy) => set({ activePolicy: policy }),
  setPlans: (plans) => set({ plans }),
  clearPolicy: () => set({ activePolicy: null })
}));

export default usePolicyStore;
