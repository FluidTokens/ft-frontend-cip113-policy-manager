'use client';

import { useState } from 'react';
import {
  getFluidMesh,
  SUCCESS_MESSAGES,
  FluidMeshSuccessCode,
  Cip113PolicyData,
} from '@/lib/FluidMesh';
import { useWallet } from '@/store/walletStore';
import { usePolicyStore } from '@/store/policyStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PolicyPicker } from '@/components/modals/PolicyPicker';
import { toast } from 'sonner';
import { Policy } from '@/types/general';
import { deserializeAddress } from '@meshsdk/core';

function MintForm() {
  const { wallet, address } = useWallet();
  const { policies } = usePolicyStore();

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);

  // Filter policies where current user is admin
  const availablePolicies = policies.filter((policy) =>
    policy.adminAddresses.some((admin) => admin === address)
  );

  const handleMint = async () => {
    if (!wallet || !address) {
      toast.error('Connect wallet first');
      return;
    }

    if (!selectedPolicy) {
      toast.error('Select a policy first');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      setMintLoading(true);
      const fluidMesh = getFluidMesh();

      // Get signer hash from wallet address
      const signerHash = deserializeAddress(address).pubKeyHash;

      // Calculate smart receiver address for current wallet
      const smartReceiverAddress = fluidMesh.getSmartReceiverAddress(
        selectedPolicy.scriptCbor,
        signerHash,
        false
      );

      // Reconstruct policy data from stored policy
      const policyData: Cip113PolicyData = {
        tokenName: selectedPolicy.tokenName,
        tokenNameHex: selectedPolicy.tokenNameHex,
        signerHash: signerHash,
        ruleScript: {
          scriptCbor: selectedPolicy.ruleScriptCbor,
          scriptAddr: '',
          policy: selectedPolicy.ruleScriptPolicy,
          rewardAddress: selectedPolicy.ruleScriptRewardAddress,
        },
        smartToken: {
          scriptCbor: selectedPolicy.scriptCbor,
          scriptAddr: '',
          policy: selectedPolicy.policyId,
          rewardAddress: selectedPolicy.smartTokenRewardAddress,
        },
        smartReceiverAddress: smartReceiverAddress,
      };

      const result = await fluidMesh.mintPolicy(wallet, policyData, quantity);

      // Handle errors
      if (!result.success) {
        toast.error(result.error?.userMessage || 'Mint failed');
        return;
      }

      toast.success(
        `${SUCCESS_MESSAGES[FluidMeshSuccessCode.MINTING_SUCCESS]} TxHash: ${result.data?.txHash}`
      );

      // Reset form
      setQuantity('1');
    } catch (error) {
      console.error('Mint error:', error);
      toast.error(
        `Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setMintLoading(false);
    }
  };

  return (
    <div className='border-border bg-soft mx-auto max-w-xl space-y-4 rounded-4xl border p-6'>
      <h2 className='text-2xl font-bold'>Mint CIP113 Tokens</h2>

      <div className='space-y-3'>
        <div>
          <label className='mb-1 block text-sm font-medium'>
            Selected Policy
          </label>
          <Button
            variant='outline'
            onClick={() => setPickerOpen(true)}
            className='h-auto w-full justify-start p-3 text-left'
          >
            {selectedPolicy ? (
              <div className='flex flex-col items-start gap-1'>
                <span className='font-semibold'>
                  {selectedPolicy.tokenName}
                </span>
              </div>
            ) : (
              <span className='text-muted-foreground'>Select a policy</span>
            )}
          </Button>
        </div>

        <div>
          <label className='mb-1 block text-sm font-medium'>Quantity</label>
          <Input
            type='number'
            placeholder='1'
            value={quantity}
            className='bg-soft border-none'
            onChange={(e) => setQuantity(e.target.value)}
            min='1'
          />
        </div>

        <div className='flex gap-3 pt-4'>
          <Button
            onClick={handleMint}
            loading={mintLoading}
            disabled={mintLoading || !wallet || !selectedPolicy}
            className='h-10 w-full'
          >
            Mint Tokens
          </Button>
        </div>

        {!wallet && (
          <p className='text-sm text-red-500'>
            Please connect your wallet first
          </p>
        )}

        {wallet && availablePolicies.length === 0 && (
          <p className='text-muted-foreground text-sm'>
            No policies found where you are an admin. Create a policy first.
          </p>
        )}
      </div>

      <PolicyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        policies={availablePolicies}
        onSelect={setSelectedPolicy}
        selectedPolicyId={selectedPolicy?.id}
      />
    </div>
  );
}

export default MintForm;
