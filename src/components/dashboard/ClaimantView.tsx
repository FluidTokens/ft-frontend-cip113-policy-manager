'use client';

import { useMemo } from 'react';
import { useClaimStore } from '@/store/claimStore';
import { usePolicyStore } from '@/store/policyStore';
import { useWallet } from '@/store/walletStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { maestroNetwork } from '@/config/mesh';

export function ClaimantView() {
  const { address } = useWallet();
  const { claimLists } = useClaimStore();
  const { policies } = usePolicyStore();

  // Find all claim entries where current user is a claimant
  const myClaimableTokens = useMemo(() => {
    if (!address) return [];

    const claimable: Array<{
      claimListId: string;
      policyId: string;
      policyName: string;
      tokenName: string;
      maxClaimable: string;
      mintTxHash: string;
      createdAt: string;
    }> = [];

    claimLists.forEach((claimList) => {
      const myClaim = claimList.claims.find((c) => c.address === address);
      if (myClaim) {
        const policy = policies.find((p) => p.policyId === claimList.policyId);
        claimable.push({
          claimListId: claimList.id,
          policyId: claimList.policyId,
          policyName: policy?.tokenName || 'Unknown Policy',
          tokenName: policy?.tokenName || 'Unknown Token',
          maxClaimable: myClaim.maxClaimable,
          mintTxHash: claimList.mintTxHash,
          createdAt: claimList.createdAt,
        });
      }
    });

    return claimable;
  }, [address, claimLists, policies]);

  // Format date
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get explorer URL for transaction
  const getExplorerUrl = (txHash: string) => {
    const baseUrl =
      maestroNetwork === 'Preview'
        ? 'https://preprod.cardanoscan.io'
        : 'https://cardanoscan.io';
    return `${baseUrl}/transaction/${txHash}`;
  };

  // Handle claim (fake for now - will be implemented with smart contract)
  const handleClaim = (claimData: (typeof myClaimableTokens)[0]) => {
    toast.info(
      `Claiming ${claimData.maxClaimable} ${claimData.tokenName} tokens...`
    );
    // TODO: Implement actual claiming logic with smart contract
    toast.warning('Claim functionality will be implemented soon!');
  };

  if (!address) {
    return (
      <div className='py-12 text-center'>
        <p className='text-muted-foreground text-lg'>
          Connect your wallet to see claimable tokens
        </p>
      </div>
    );
  }

  if (myClaimableTokens.length === 0) {
    return (
      <div className='py-12 text-center'>
        <p className='text-muted-foreground text-lg'>
          No tokens available for claiming
        </p>
        <p className='text-muted-foreground mt-2 text-sm'>
          You don&apos;t have any claimable tokens at this address.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-2xl font-bold'>My Claimable Tokens</h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Tokens you are eligible to claim
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        {myClaimableTokens.map((claim) => (
          <div
            key={claim.claimListId}
            className='border-border bg-soft space-y-4 rounded-4xl border p-6'
          >
            <div>
              <h3 className='text-lg font-semibold'>{claim.tokenName}</h3>
              <p className='text-muted-foreground text-xs'>
                Policy: {claim.policyId.slice(0, 20)}...
              </p>
            </div>

            <div className='space-y-2'>
              <div className='flex items-baseline justify-between'>
                <span className='text-muted-foreground text-sm'>
                  Max Claimable:
                </span>
                <span className='text-primary text-2xl font-bold'>
                  {claim.maxClaimable}
                </span>
              </div>

              <div className='text-muted-foreground flex justify-between text-xs'>
                <span>Mint Date:</span>
                <span>{formatDate(claim.createdAt)}</span>
              </div>

              <div className='text-xs'>
                <span className='text-muted-foreground'>Mint TX: </span>
                <a
                  href={getExplorerUrl(claim.mintTxHash)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:underline'
                >
                  {claim.mintTxHash.slice(0, 10)}...
                </a>
              </div>
            </div>

            <Button className='w-full'>
              Claim {claim.maxClaimable} Tokens
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
