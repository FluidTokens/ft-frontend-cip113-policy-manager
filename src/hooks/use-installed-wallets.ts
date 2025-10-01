import { useState, useLayoutEffect } from 'react';
import { getInstalledWallets } from '@/lib/wallet';
import { Wallet } from '@meshsdk/core';

export function useInstalledWallets() {
  const [installedWallets, setInstalledWallets] = useState<Wallet[]>([]);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const wallets = getInstalledWallets();
      setInstalledWallets(wallets);
    }
  }, []);

  return installedWallets;
}