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
import { Wallet, X } from 'lucide-react';

type Recipient = {
  address: string;
  amount: string;
};

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
  onTransfer: (recipients: Recipient[]) => Promise<void>;
  loading?: boolean;
};

export function TransferTokenModal({
  open,
  onOpenChange,
  token,
  onTransfer,
  loading = false,
}: TransferTokenModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: '', amount: '' },
  ]);

  if (!token) return null;

  /* ---------------- helpers ---------------- */

  const addRecipient = () =>
    setRecipients([...recipients, { address: '', amount: '' }]);

  const removeRecipient = (index: number) =>
    setRecipients(recipients.filter((_, i) => i !== index));

  const updateRecipient = (
    index: number,
    field: keyof Recipient,
    value: string
  ) => {
    const copy = [...recipients];
    copy[index][field] = value;
    setRecipients(copy);
  };

  const totalAmount = recipients.reduce(
    (acc, r) => acc + (r.amount ? BigInt(r.amount) : BigInt(0)),
    BigInt(0)
  );

  const isValid =
    recipients.every(
      (r) => r.address.length > 0 && BigInt(r.amount || '0') > 0
    ) && totalAmount <= BigInt(token.totalQuantity);

  const handleTransfer = async () => {
    if (!isValid) return;
    await onTransfer(recipients);
    setRecipients([{ address: '', amount: '' }]);
  };

  /* ---------------- UI ---------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg overflow-auto'>
        <DialogHeader>
          <DialogTitle>Send rewards Tokens</DialogTitle>
          <DialogDescription>
            Send CIP113 tokens to multiple recipients in one transaction
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Token Info */}
          <div className='rounded-lg bg-[#202740] p-4'>
            <div className='mb-2 flex justify-between'>
              <span className='text-muted-foreground text-sm'>Token</span>
              <span className='font-semibold'>{token.assetNameDecoded}</span>
            </div>
            <div className='mb-2 flex justify-between'>
              <span className='text-muted-foreground text-sm'>Policy</span>
              <span className='text-sm'>{token.policy.tokenName}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground text-sm'>
                Available Balance
              </span>
              <span className='text-lg font-bold'>{token.totalQuantity}</span>
            </div>
          </div>

          {/* Recipients */}
          <div className='space-y-4'>
            <Label>Recipients</Label>

            {recipients.map((r, i) => (
              <div key={i} className='grid grid-cols-12 items-center gap-2'>
                <div className='relative col-span-7'>
                  <Wallet className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
                  <Input
                    placeholder='addr1...'
                    className='pl-10'
                    value={r.address}
                    onChange={(e) =>
                      updateRecipient(i, 'address', e.target.value)
                    }
                  />
                </div>

                <Input
                  className='col-span-3'
                  type='number'
                  min='1'
                  placeholder='0'
                  value={r.amount}
                  onChange={(e) => updateRecipient(i, 'amount', e.target.value)}
                />

                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => removeRecipient(i)}
                  disabled={recipients.length === 1}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ))}

            <Button variant='outline' size='sm' onClick={addRecipient}>
              + Add recipient
            </Button>
          </div>

          {/* Summary */}
          <div className='bg-primary/5 rounded-lg border p-4'>
            <p className='text-muted-foreground text-sm'>Total to send</p>
            <p className='text-xl font-bold'>
              {totalAmount.toString()} {token.assetNameDecoded}
            </p>
            {totalAmount > BigInt(token.totalQuantity) && (
              <p className='mt-1 text-xs text-red-500'>
                Amount exceeds available balance
              </p>
            )}
          </div>

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
              disabled={!isValid || loading}
              loading={loading}
              className='flex-1'
            >
              Transfer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
