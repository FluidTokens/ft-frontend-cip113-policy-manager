/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, firstLetterUppercase, truncateString } from '@/lib/utils';
import { useWallet } from '@/store/walletStore';

import {
  ArrowUpRight,
  ChevronRightIcon,
  LoaderCircle,
  WalletIcon,
  Copy,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import {
  WALLET_CHROME_EXTENSION_URL,
  WalletList,
  WalletName,
} from '@/shared/wallet';
import { enableWallet } from '@/lib/wallet';
import { useInstalledWallets } from '@/hooks/use-installed-wallets';

function ConnectWalletModal() {
  const {
    setWalletName,
    setLoading,
    setWallet,
    setAddress,
    wallet,
    walletName,
    loading,
    address,
    reset,
  } = useWallet();

  const installedWallets = useInstalledWallets();

  const [connectingWallet, setConnectingWallet] = useState<WalletName | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleWalletConnect = async (selectedWalletName: WalletName) => {
    try {
      setConnectingWallet(selectedWalletName);
      setLoading(true);

      const existingWallet = installedWallets.find(
        (wallet) => wallet.id === selectedWalletName
      );

      if (!existingWallet) {
        window.open(WALLET_CHROME_EXTENSION_URL[selectedWalletName], '_blank');
        return;
      }

      const enabledWallet = await enableWallet(selectedWalletName);

      if (!enabledWallet) {
        console.error(`Failed to enable wallet: ${selectedWalletName}`);
        return;
      }

      setWallet(enabledWallet);
      setWalletName(selectedWalletName);

      const address = await enabledWallet.getChangeAddress();
      setAddress(address);

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    } finally {
      setLoading(false);
      setConnectingWallet(null);
    }
  };

  const handleDisconnect = () => {
    reset();
  };

  return (
    <>
      {wallet && walletName && address ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={'outline'}
              data-slot='wallet-dropdown'
              disabled={loading}
            >
              <img
                src={installedWallets.find((w) => w.id === walletName)?.icon}
                alt={`${walletName} icon`}
                className='mr-1 inline-block h-5 w-5 rounded-full'
              />
              <div className='flex flex-col items-start justify-start space-y-0'>
                <p className='text-[10px]'>{walletName}</p>
                <small className='text-[8px]'>
                  {truncateString(address, 10, true)}
                </small>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>
              {firstLetterUppercase(walletName)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(address)}
              className='flex items-center gap-2'
            >
              <Copy className='h-4 w-4' />
              Copy Address
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDisconnect}
              className='flex items-center gap-2 text-red-500'
            >
              <LogOut className='h-4 w-4' />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-slot='connect-wallet-button'
              disabled={loading}
              loading={loading}
              className='w-max font-medium'
            >
              CONNECT WALLET
            </Button>
          </DialogTrigger>

          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <WalletIcon className='h-5 w-5' />
                Connect Your Wallet
              </DialogTitle>
              <DialogDescription>
                Choose a wallet to connect and interact with the application.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className='relative max-h-[400px]'>
              <div className='from-background pointer-events-none absolute right-0 bottom-0 left-0 z-10 flex h-24 items-center justify-center bg-gradient-to-t to-transparent' />
              <div className='flex flex-col gap-3 pb-16'>
                {WalletList.map((walletItem) => {
                  const isConnecting = connectingWallet === walletItem.name;
                  const isCurrentWallet = walletName === walletItem.name;
                  const isInstalled = installedWallets.some(
                    (w) => w.id === walletItem.name
                  );

                  return (
                    <Button
                      key={walletItem.name}
                      className='flex w-full justify-between'
                      variant='outline'
                      onClick={() => handleWalletConnect(walletItem.name)}
                      disabled={loading}
                    >
                      <div className='flex items-center'>
                        <img
                          src={walletItem.image}
                          alt={`${walletItem.name} icon`}
                          className='mr-4 h-8 w-8 rounded-md'
                        />
                        <span className='text-base font-medium'>
                          {firstLetterUppercase(walletItem.name)}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span
                          className={cn(
                            'text-muted-foreground text-xs',
                            isCurrentWallet &&
                              'rounded-full bg-green-300/20 px-2 py-1 text-xs text-green-400'
                          )}
                        >
                          {isCurrentWallet
                            ? 'Connected'
                            : !isInstalled
                              ? 'Not installed'
                              : ''}
                        </span>
                        {isConnecting ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : !isInstalled ? (
                          <ArrowUpRight className='h-4 w-4' />
                        ) : (
                          <ChevronRightIcon className='h-4 w-4' />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ConnectWalletModal;
