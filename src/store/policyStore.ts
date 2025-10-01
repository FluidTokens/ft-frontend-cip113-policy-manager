import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Policy } from '@/types/general';

type PolicyState = {
  policies: Policy[];
  loading: boolean;
};

type PolicyAction = {
  addPolicy: (policy: Policy) => void;
  removePolicy: (id: string) => void;
  updatePolicy: (id: string, policy: Partial<Policy>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

const initialState: PolicyState = {
  policies: [],
  loading: false,
};

export const usePolicyStore = create<PolicyState & PolicyAction>()(
  persist(
    (set) => ({
      ...initialState,
      addPolicy: (policy: Policy) =>
        set((state) => ({ policies: [...state.policies, policy] })),
      removePolicy: (id: string) =>
        set((state) => ({
          policies: state.policies.filter((p) => p.id !== id),
        })),
      updatePolicy: (id: string, updatedPolicy: Partial<Policy>) =>
        set((state) => ({
          policies: state.policies.map((p) =>
            p.id === id ? { ...p, ...updatedPolicy } : p
          ),
        })),
      setLoading: (loading: boolean) => set({ loading }),
      reset: () => set(initialState),
    }),
    {
      name: 'cip113-policy-manager-policy',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
