'use client';

import { useState } from 'react';
import { useClaimStore } from '@/store/claimStore';
import { usePolicyStore } from '@/store/policyStore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { maestroNetwork } from '@/config/mesh';

export function ClaimListViewer() {
  const { claimLists, removeClaimList } = useClaimStore();
  const { policies } = usePolicyStore();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('all');

  // Filter claim lists by selected policy
  const filteredClaimLists =
    selectedPolicyId === 'all'
      ? claimLists
      : claimLists.filter((cl) => cl.policyId === selectedPolicyId);

  // Get policy name from ID
  const getPolicyName = (policyId: string) => {
    const policy = policies.find((p) => p.policyId === policyId);
    return policy?.tokenName || 'Unknown Policy';
  };

  // Format date
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  // Handle delete claim list
  const handleDelete = (id: string, policyName: string) => {
    if (
      confirm(
        `Are you sure you want to delete the claim list for ${policyName}?`
      )
    ) {
      removeClaimList(id);
      toast.success('Claim list deleted successfully');
    }
  };

  // Export to CSV
  const handleExportCsv = (claimList: (typeof claimLists)[0]) => {
    const policyName = getPolicyName(claimList.policyId);
    const csvContent = [
      ['Address', 'Max Claimable'],
      ...claimList.claims.map((claim) => [
        claim.address,
        claim.maxClaimable,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `claim-list-${policyName}-${claimList.mintTxHash.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>Claim Lists</h2>

        {/* Filter by policy */}
        {policies.length > 0 && (
          <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
            <SelectTrigger className='w-[200px]'>
              <SelectValue placeholder='All Policies' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Policies</SelectItem>
              {policies.map((policy) => (
                <SelectItem key={policy.id} value={policy.policyId}>
                  {policy.tokenName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Claim lists */}
      <div className='space-y-4'>
        {filteredClaimLists.map((claimList) => {
          const policyName = getPolicyName(claimList.policyId);

          return (
            <div
              key={claimList.id}
              className='border-border bg-soft rounded-4xl border p-6 space-y-4'
            >
              <div className='flex justify-between items-start'>
                <div>
                  <h3 className='text-lg font-semibold'>{policyName}</h3>
                  <p className='text-muted-foreground text-sm'>
                    Mint TX:{' '}
                    <a
                      href={getExplorerUrl(claimList.mintTxHash)}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-primary hover:underline'
                    >
                      {claimList.mintTxHash.slice(0, 10)}...
                    </a>
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Created: {formatDate(claimList.createdAt)}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    By: {claimList.createdBy.slice(0, 20)}...
                  </p>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <p className='text-lg font-bold'>
                    Pool: {claimList.totalClaimPool}
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleExportCsv(claimList)}
                    >
                      Export CSV
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDelete(claimList.id, policyName)}
                      className='text-red-500 hover:text-red-600'
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Claims table */}
              <div className='border rounded-lg overflow-hidden'>
                <table className='w-full'>
                  <thead className='bg-muted'>
                    <tr>
                      <th className='text-left p-3 text-sm font-semibold'>
                        Address
                      </th>
                      <th className='text-right p-3 text-sm font-semibold'>
                        Max Claimable
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {claimList.claims.map((claim) => (
                      <tr key={claim.id} className='hover:bg-muted/50'>
                        <td className='p-3 font-mono text-xs'>
                          {claim.address}
                        </td>
                        <td className='p-3 text-right font-semibold'>
                          {claim.maxClaimable}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className='flex justify-between text-sm text-muted-foreground'>
                <span>Total claimants: {claimList.claims.length}</span>
                <span>
                  Total allocated:{' '}
                  {claimList.claims.reduce(
                    (sum, claim) => sum + parseInt(claim.maxClaimable),
                    0
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClaimLists.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-muted-foreground text-lg'>
            No claim lists found
            {selectedPolicyId !== 'all' ? ' for this policy' : ''}.
          </p>
          <p className='text-muted-foreground text-sm mt-2'>
            Create a claim list when minting tokens to track eligible
            claimants.
          </p>
        </div>
      )}
    </div>
  );
}
