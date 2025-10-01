
import { WalletName } from '@/shared/wallet';
import { BrowserWallet, MaestroSupportedNetworks } from '@meshsdk/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { maestroNetwork } from '@/config/mesh';
type WalletState = {
  loading: boolean;
  wallet?: BrowserWallet;
  walletName?: WalletName;
  address?: string;
  network: MaestroSupportedNetworks;
};

type WalletAction = {
  setLoading: (loading: boolean) => void;
  setWallet: (wallet: BrowserWallet) => void;
  setWalletName: (walletName: WalletName) => void;
  setAddress: (address: string) => void;
  setNetwork: (network: MaestroSupportedNetworks) => void;
  reset: () => void;
};

const initialState: WalletState = {
  loading: true,
  wallet: undefined,
  walletName: undefined,
  address: undefined,
  network: (process.env.NETWORK as MaestroSupportedNetworks) || 'Preview',
};

export const useWallet = create<WalletState & WalletAction>()(
  persist(
    (set) => ({
      ...initialState,
      setLoading: (loading: boolean) => set({ loading }),
      setWallet: (wallet: BrowserWallet) => set({ wallet }),
      setWalletName: (walletName: WalletName) => set({ walletName }),
      setAddress: (address: string) => set({ address }),
      setNetwork: (network: MaestroSupportedNetworks) => set({ network }),
      reset: () => set({ ...initialState, loading: false }),
    }),
    {
      name: 'cip113-policy-manager-wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        walletName: state.walletName,
        network: state.network,
      }),
      onRehydrateStorage: () => {
        return async (state) => {
          if (state?.walletName) {
            try {
              state?.setLoading(true);

              // Enable wallet
              const wallet = await BrowserWallet.enable(state.walletName);

              // If wallet network is not the same of state, show error 0 is preview and 1 mainnet
              const walletNetwork = await wallet.getNetworkId();

              const isPreview = maestroNetwork === 'Preview';

              if (walletNetwork !== (isPreview ? 0 : 1)) {
                toast.error(`Wallet network mismatch`);
              }

              state.setWallet(wallet);

              // Set connected state and update address
              state.setAddress(await wallet.getChangeAddress());

              return state;
            } catch {
              // Reset
              state.reset();

              return state;
            } finally {
              state.setLoading(false);
            }
          } else {
            // Loading false
            if (state) state.setLoading(false);

            return state;
          }
        };
      },
    }
  )
);
