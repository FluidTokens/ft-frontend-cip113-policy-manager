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
import { Loader2 } from 'lucide-react';

type AggregatedToken = {
  assetName: string;
  assetNameDecoded: string;
  totalQuantity: string;
  policyId: string;
};

type BurnTokenModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: AggregatedToken | null;
  onBurn: (amount: string) => Promise<void>;
  loading: boolean;
};

export function BurnTokenModal({
  open,
  onOpenChange,
  token,
  onBurn,
  loading,
}: BurnTokenModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleBurn = async () => {
    if (!token) return;

    // Validate amount
    const amountBigInt = BigInt(amount);
    const maxBigInt = BigInt(token.totalQuantity);

    if (amountBigInt <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (amountBigInt > maxBigInt) {
      setError('Amount exceeds available balance');
      return;
    }

    setError('');
    await onBurn(amount);
    setAmount('');
  };

  const handleMaxClick = () => {
    if (token) {
      setAmount(token.totalQuantity);
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Burn Tokens</DialogTitle>
          <DialogDescription>
            Permanently destroy {token?.assetNameDecoded} tokens
          </DialogDescription>
        </DialogHeader>

        {token && (
          <div className='space-y-4'>
            <div>
              <p className='text-sm text-muted-foreground'>Token</p>
              <p className='font-semibold'>{token.assetNameDecoded}</p>
              <p className='text-xs text-muted-foreground font-mono'>
                {token.policyId.slice(0, 16)}...
              </p>
            </div>

            <div>
              <p className='text-sm text-muted-foreground'>Available Balance</p>
              <p className='text-2xl font-bold'>{token.totalQuantity}</p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='amount'>Amount to Burn</Label>
              <div className='flex gap-2'>
                <Input
                  id='amount'
                  type='number'
                  placeholder='0'
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  min='1'
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleMaxClick}
                  disabled={loading}
                >
                  Max
                </Button>
              </div>
              {error && <p className='text-sm text-red-500'>{error}</p>}
            </div>

            <div className='space-y-3'>
              <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3'>
                <p className='text-sm text-blue-600 dark:text-blue-400 font-semibold'>
                  Admin-Only Operation
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Only policy administrators can burn tokens
                </p>
              </div>

              <div className='bg-destructive/10 border border-destructive/20 rounded-lg p-3'>
                <p className='text-sm text-destructive font-semibold'>
                  Warning: This action cannot be undone
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Burned tokens are permanently removed from circulation
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleBurn}
            disabled={loading || !amount}
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Burning...
              </>
            ) : (
              'Burn Tokens'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
