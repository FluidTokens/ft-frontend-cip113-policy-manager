'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Policy } from '@/types/general';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policies: Policy[];
  onSelect: (policy: Policy) => void;
  selectedPolicyId?: string;
};

export function PolicyPicker({
  open,
  onOpenChange,
  policies,
  onSelect,
  selectedPolicyId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Select Policy</DialogTitle>
          <DialogDescription>
            Choose a policy where you are an admin to mint tokens
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-[60vh] space-y-3 overflow-y-auto'>
          {policies.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center text-sm'>
              No policies found. Create a policy first.
            </p>
          ) : (
            policies.map((policy) => (
              <button
                key={policy.id}
                onClick={() => {
                  onSelect(policy);
                  onOpenChange(false);
                }}
                className={`hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedPolicyId === policy.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex-1 space-y-2'>
                    <div className='flex items-center gap-2'>
                      <h3 className='font-semibold'>{policy.tokenName}</h3>
                      {selectedPolicyId === policy.id && (
                        <Check className='text-primary h-4 w-4' />
                      )}
                    </div>

                    <div className='space-y-1 text-sm'>
                      <p className='text-muted-foreground'>
                        <span className='font-medium'>Policy ID:</span>{' '}
                        <span className='font-mono text-xs'>
                          {policy.policyId.slice(0, 20)}...
                        </span>
                      </p>

                      <div className='flex gap-2'>
                        {policy.blackList && (
                          <span className='bg-secondary rounded px-2 py-0.5 text-xs'>
                            Blacklist
                          </span>
                        )}
                        {policy.whiteList && (
                          <span className='bg-secondary rounded px-2 py-0.5 text-xs'>
                            Whitelist
                          </span>
                        )}
                      </div>

                      <p className='text-muted-foreground text-xs'>
                        Created:{' '}
                        {new Date(policy.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className='flex justify-end'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
