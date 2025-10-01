import { BrowserWallet } from "@meshsdk/core";
import { WalletName } from '@/shared/wallet';

export const getInstalledWallets = () => {
  return BrowserWallet.getInstalledWallets()
}

export const enableWallet = async (walletName: WalletName) => {
  try {
    // Check if the wallet is already enabled
    const existingWallet = getInstalledWallets().find(
      (wallet) => wallet.id === walletName
    );
    if (!existingWallet) {
      return null;
    }

    const walletApi = await BrowserWallet.enable(walletName);
    if (!walletApi) {
      throw new Error(`Failed to enable wallet: ${walletName}`);
    }

    return walletApi;
  } catch (error) {
    console.error('Error enabling wallet:', error);
    throw error;
  }
};