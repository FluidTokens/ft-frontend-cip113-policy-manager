'use client';

import { useState } from 'react';
import {
  getFluidMesh,
  SUCCESS_MESSAGES,
  FluidMeshSuccessCode,
} from '@/lib/FluidMesh';
import { useWallet } from '@/store/walletStore';
import { usePolicyStore } from '@/store/policyStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

function CreatePolicyForm() {
  const { wallet, address } = useWallet();
  const { addPolicy } = usePolicyStore();

  const [tokenName, setTokenName] = useState('');

  const [blackList, setBlackList] = useState(false);
  const [whiteList, setWhiteList] = useState(false);
  const [adminAddresses, setAdminAddresses] = useState('');

  const [loading, setLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);

  const handleDeploy = async () => {
    if (!wallet || !address) {
      toast.error('Connect wallet first');
      return;
    }

    if (!tokenName.trim()) {
      toast.error('Token name is required');
      return;
    }

    try {
      setDeployLoading(true);
      const fluidMesh = getFluidMesh();

      const config = {
        tokenName: tokenName.trim(),
        blackList,
        whiteList,
        adminAddresses: adminAddresses.trim()
          ? adminAddresses.split(',').map((a) => a.trim())
          : [address],
      };

      const policyData = await fluidMesh.createPolicyData(config, address);

      const result = await fluidMesh.deployPolicy(wallet, policyData);

      // Handle errors
      if (!result.success) {
        toast.error(result.error?.userMessage || 'Deploy failed');
        return;
      }

      // Save policy to store with all useful information
      const newPolicy = {
        id: uuidv4(),
        policyId: policyData.smartToken.policy,
        tokenName: config.tokenName,
        tokenNameHex: policyData.tokenNameHex,
        blackList: config.blackList,
        whiteList: config.whiteList,
        txHash: result.data?.txHash || '',
        adminAddresses: config.adminAddresses,
        scriptCbor: policyData.smartToken.scriptCbor,
        smartTokenRewardAddress: policyData.smartToken.rewardAddress,
        ruleScriptPolicy: policyData.ruleScript.policy,
        ruleScriptCbor: policyData.ruleScript.scriptCbor,
        ruleScriptRewardAddress: policyData.ruleScript.rewardAddress,
        smartReceiverAddress: policyData.smartReceiverAddress,
        createdAt: new Date().toISOString(),
        deployedBy: address,
      };

      addPolicy(newPolicy);

      // Show appropriate success message
      if (
        result.data?.successCode ===
        FluidMeshSuccessCode.CREDENTIALS_ALREADY_REGISTERED
      ) {
        toast.info(
          SUCCESS_MESSAGES[FluidMeshSuccessCode.CREDENTIALS_ALREADY_REGISTERED]
        );
      } else {
        toast.success(
          `${SUCCESS_MESSAGES[FluidMeshSuccessCode.DEPLOYMENT_SUCCESS]} TxHash: ${result.data?.txHash}`
        );
      }
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error(
        `Deploy failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setDeployLoading(false);
    }
  };

  return (
    <div className='border-border bg-soft mx-auto max-w-xl space-y-4 rounded-4xl border p-6'>
      <h2 className='text-2xl font-bold'>Create CIP113 Policy</h2>

      <div className='space-y-4'>
        <div>
          <label className='text-muted-foreground mb-1 block text-sm font-medium'>
            Token Name*
          </label>
          <Input
            placeholder='e.g. MyToken'
            value={tokenName}
            className='bg-soft border-none'
            onChange={(e) => setTokenName(e.target.value)}
          />
        </div>

        <div>
          <label className='text-muted-foreground mb-1 block text-sm font-medium'>
            Admin Addresses
          </label>
          <Input
            placeholder='addr1..., addr2...'
            value={adminAddresses}
            onChange={(e) => setAdminAddresses(e.target.value)}
          />
        </div>

        <div className='flex flex-col gap-3'>
          <Label className='hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex items-start gap-3 rounded-lg border p-3'>
            <Checkbox
              id='blacklist'
              checked={blackList}
              onCheckedChange={(checked) => setBlackList(checked === true)}
              className='data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white'
            />
            <div className='grid gap-1.5 font-normal'>
              <p className='text-sm leading-none font-medium'>
                Enable Blacklist
              </p>
              <p className='text-muted-foreground text-sm'>
                Restrict specific addresses from interacting with your token
              </p>
            </div>
          </Label>

          <Label className='hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex items-start gap-3 rounded-lg border p-3'>
            <Checkbox
              id='whitelist'
              checked={whiteList}
              onCheckedChange={(checked) => setWhiteList(checked === true)}
              className='data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white'
            />
            <div className='grid gap-1.5 font-normal'>
              <p className='text-sm leading-none font-medium'>
                Enable Whitelist
              </p>
              <p className='text-muted-foreground text-sm'>
                Allow only specific addresses to interact with your token
              </p>
            </div>
          </Label>
        </div>

        <div className='flex gap-3 pt-4'>
          <Button
            onClick={handleDeploy}
            loading={deployLoading}
            disabled={loading || !wallet}
            className='h-10 w-full'
          >
            Deploy Policy
          </Button>
        </div>

        {!wallet && (
          <p className='text-sm text-red-500'>
            Please connect your wallet first
          </p>
        )}
      </div>
    </div>
  );
}

export default CreatePolicyForm;
