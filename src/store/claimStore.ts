import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ClaimList } from '@/types/general';

type ClaimState = {
  claimLists: ClaimList[];
  loading: boolean;
};

type ClaimAction = {
  addClaimList: (claimList: ClaimList) => void;
  removeClaimList: (id: string) => void;
  updateClaimList: (id: string, updates: Partial<ClaimList>) => void;
  getClaimListsByPolicy: (policyId: string) => ClaimList[];
  getClaimListByMintTx: (mintTxHash: string) => ClaimList | undefined;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

const initialState: ClaimState = {
  claimLists: [],
  loading: false,
};

export const useClaimStore = create<ClaimState & ClaimAction>()(
  persist(
    (set, get) => ({
      ...initialState,

      addClaimList: (claimList: ClaimList) =>
        set((state) => ({
          claimLists: [...state.claimLists, claimList],
        })),

      removeClaimList: (id: string) =>
        set((state) => ({
          claimLists: state.claimLists.filter((cl) => cl.id !== id),
        })),

      updateClaimList: (id: string, updates: Partial<ClaimList>) =>
        set((state) => ({
          claimLists: state.claimLists.map((cl) =>
            cl.id === id ? { ...cl, ...updates } : cl
          ),
        })),

      getClaimListsByPolicy: (policyId: string) => {
        return get().claimLists.filter((cl) => cl.policyId === policyId);
      },

      getClaimListByMintTx: (mintTxHash: string) => {
        return get().claimLists.find((cl) => cl.mintTxHash === mintTxHash);
      },

      setLoading: (loading: boolean) => set({ loading }),

      reset: () => set(initialState),
    }),
    {
      name: 'cip113-policy-manager-claims',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
