'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Policy } from '@/types/general';
import { ArrowRight, Wallet } from 'lucide-react';

type TransferTokenModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: {
    assetName: string;
    assetNameDecoded: string;
    totalQuantity: string;
    policyId: string;
    policy: Policy;
  } | null;
  onTransfer: (recipientAddress: string, amount: string) => Promise<void>;
  loading?: boolean;
};

export function TransferTokenModal({
  open,
  onOpenChange,
  token,
  onTransfer,
  loading = false,
}: TransferTokenModalProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handleTransfer = async () => {
    if (!token || !recipientAddress || !amount) return;

    await onTransfer(recipientAddress, amount);

    // Reset form
    setRecipientAddress('');
    setAmount('');
  };

  const handleSetMax = () => {
    if (token) {
      setAmount(token.totalQuantity);
    }
  };

  const isValidAmount =
    amount &&
    parseFloat(amount) > 0 &&
    token &&
    parseFloat(amount) <= parseFloat(token.totalQuantity);

  const isValidAddress = recipientAddress.length > 0;

  if (!token) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg overflow-auto'>
        <DialogHeader>
          <DialogTitle>Transfer Tokens</DialogTitle>
          <DialogDescription>
            Send CIP113 tokens to another address
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 overflow-y-auto'>
          {/* Token Info */}
          <div className='bg-secondary/50 rounded-lg p-4'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Token</span>
              <span className='font-semibold'>{token.assetNameDecoded}</span>
            </div>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>Policy</span>
              <span className='text-sm'>{token.policy.tokenName}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                Available Balance
              </span>
              <span className='text-lg font-bold'>{token.totalQuantity}</span>
            </div>
          </div>
          {/* Recipient Address */}
          <div className='space-y-2'>
            <Label htmlFor='recipient'>Recipient Address</Label>
            <div className='relative'>
              <Wallet className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
              <Input
                id='recipient'
                placeholder='addr1...'
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className='pl-10'
              />
            </div>
            <p className='text-muted-foreground text-xs'>
              Enter the Cardano address of the recipient
            </p>
          </div>
          {/* Amount */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='amount'>Amount</Label>
              <Button
                type='button'
                variant='link'
                size='sm'
                onClick={handleSetMax}
                className='h-auto p-0 text-xs'
              >
                Max
              </Button>
            </div>
            <Input
              id='amount'
              type='number'
              placeholder='0'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min='1'
              max={token.totalQuantity}
            />
            {amount && !isValidAmount && (
              <p className='text-xs text-red-500'>
                Invalid amount. Must be between 1 and {token.totalQuantity}
              </p>
            )}
          </div>
          {/* Transfer Summary */}
          {isValidAmount && isValidAddress && (
            <div className='bg-primary/10 border-primary rounded-lg border p-4'>
              <div className='mb-2 flex items-center justify-center gap-2'>
                <div className='text-center'>
                  <p className='text-muted-foreground text-xs'>You send</p>
                  <p className='text-lg font-bold'>{amount}</p>
                  <p className='text-muted-foreground text-xs'>
                    {token.assetNameDecoded}
                  </p>
                </div>
                <ArrowRight className='text-primary h-5 w-5' />
                <div className='text-center'>
                  <p className='text-muted-foreground text-xs'>They receive</p>
                  <p className='text-lg font-bold'>{amount}</p>
                  <p className='text-muted-foreground text-xs'>
                    {token.assetNameDecoded}
                  </p>
                </div>
              </div>
              <div className='border-primary/20 mt-3 border-t pt-3'>
                <p className='text-muted-foreground text-xs'>
                  Recipient:{' '}
                  <span className='font-mono'>
                    {recipientAddress.slice(0, 20)}...
                  </span>
                </p>
              </div>
            </div>
          )}
          {/* Actions */}
          <DialogFooter className='flex gap-3'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='flex-1'
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!isValidAmount || !isValidAddress || loading}
              loading={loading}
              className='flex-1'
            >
              Transfer
            </Button>
          </DialogFooter>{' '}
        </div>
      </DialogContent>
    </Dialog>
  );
}
