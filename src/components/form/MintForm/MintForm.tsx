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
import { useClaimStore } from '@/store/claimStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PolicyPicker } from '@/components/modals/PolicyPicker';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FragmaMintMetadataInput,
  Policy,
  RecipientAllocation,
  ClaimEntry,
  ClaimList,
} from '@/types/general';
import {
  validateRecipientAllocations,
  validateClaimList,
  validateCardanoAddress,
  validateQuantity,
} from '@/lib/validation';
import { deserializeAddress } from '@meshsdk/core';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

// Definizione del modello di stato per il metadata
interface MetadataState {
  asset_ref_id: string;
  attestation_sha256: string;
  mappingCid: string;
  mappingUrl: string;
  signatureType: string;
  signatureCid: string;
}

const initialMetadataState: MetadataState = {
  asset_ref_id: '',
  attestation_sha256: '',
  mappingCid: '',
  mappingUrl: '',
  signatureType: '',
  signatureCid: '',
};

function MintForm() {
  const { wallet, address } = useWallet();
  const { policies } = usePolicyStore();

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);

  // 1. Stato per i campi del Metadata
  const [metadata, setMetadata] = useState<MetadataState>(initialMetadataState);

  // Feature 1: Multi-recipient allocations
  const [recipientAllocations, setRecipientAllocations] = useState<RecipientAllocation[]>([]);
  const [allocationErrors, setAllocationErrors] = useState<Map<number, string>>(new Map());

  // Feature 2: Claim list
  const [enableClaimList, setEnableClaimList] = useState(false);
  const [claimPoolSize, setClaimPoolSize] = useState('0');
  const [claimEntries, setClaimEntries] = useState<Omit<ClaimEntry, 'id'>[]>([]);
  const [claimErrors, setClaimErrors] = useState<Map<number, string>>(new Map());

  // Filter policies where current user is admin
  const availablePolicies = policies.filter((policy) =>
    policy.adminAddresses.some((admin) => admin === address)
  );

  // Calculated values
  const totalAllocated = recipientAllocations.reduce(
    (sum, alloc) => sum + (parseFloat(alloc.quantity) || 0),
    0
  );
  const claimPoolAmount = parseFloat(claimPoolSize) || 0;
  const remainingForMinter = (parseFloat(quantity) || 0) - totalAllocated - claimPoolAmount;
  const totalMaxClaimable = claimEntries.reduce(
    (sum, entry) => sum + (parseFloat(entry.maxClaimable) || 0),
    0
  );

  // Helper functions for recipient allocations
  const addRecipientRow = () => {
    setRecipientAllocations([...recipientAllocations, { address: '', quantity: '0' }]);
  };

  const removeRecipientRow = (index: number) => {
    setRecipientAllocations(recipientAllocations.filter((_, i) => i !== index));
    setAllocationErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const updateRecipientAllocation = (
    index: number,
    field: keyof RecipientAllocation,
    value: string
  ) => {
    const updated = [...recipientAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setRecipientAllocations(updated);

    // Real-time validation
    if (field === 'address' && value.trim() !== '') {
      const validation = validateCardanoAddress(value);
      if (!validation.valid) {
        setAllocationErrors((prev) => new Map(prev).set(index, validation.error!));
      } else {
        setAllocationErrors((prev) => {
          const newMap = new Map(prev);
          newMap.delete(index);
          return newMap;
        });
      }
    }

    if (field === 'quantity' && value !== '0') {
      const validation = validateQuantity(value);
      if (!validation.valid) {
        setAllocationErrors((prev) => new Map(prev).set(index, validation.error!));
      } else {
        setAllocationErrors((prev) => {
          const newMap = new Map(prev);
          newMap.delete(index);
          return newMap;
        });
      }
    }
  };

  // Helper functions for claim list
  const addClaimRow = () => {
    setClaimEntries([...claimEntries, { address: '', maxClaimable: '0' }]);
  };

  const removeClaimRow = (index: number) => {
    setClaimEntries(claimEntries.filter((_, i) => i !== index));
    setClaimErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const updateClaimEntry = (
    index: number,
    field: 'address' | 'maxClaimable',
    value: string
  ) => {
    const updated = [...claimEntries];
    updated[index] = { ...updated[index], [field]: value };
    setClaimEntries(updated);

    // Real-time validation
    if (field === 'address' && value.trim() !== '') {
      const validation = validateCardanoAddress(value);
      if (!validation.valid) {
        setClaimErrors((prev) => new Map(prev).set(index, validation.error!));
      } else {
        setClaimErrors((prev) => {
          const newMap = new Map(prev);
          newMap.delete(index);
          return newMap;
        });
      }
    }

    if (field === 'maxClaimable' && value !== '0') {
      const validation = validateQuantity(value);
      if (!validation.valid) {
        setClaimErrors((prev) => new Map(prev).set(index, validation.error!));
      } else {
        setClaimErrors((prev) => {
          const newMap = new Map(prev);
          newMap.delete(index);
          return newMap;
        });
      }
    }
  };

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

    // Validazione dei campi essenziali del metadata
    if (!metadata.asset_ref_id || !metadata.attestation_sha256) {
      toast.error('Asset Reference ID and Attestation Hash are required.');
      return;
    }

    // Validate recipient allocations (Feature 1)
    const validAllocations = recipientAllocations.filter(
      (a) => a.address.trim() !== '' || a.quantity !== '0'
    );

    const allocationValidation = validateRecipientAllocations(
      validAllocations,
      quantity
    );

    if (!allocationValidation.valid) {
      toast.error(`Allocation Error: ${allocationValidation.error}`);
      return;
    }

    // Validate claim list (Feature 2) if enabled
    if (enableClaimList) {
      const poolSize = parseFloat(claimPoolSize) || 0;

      if (poolSize <= 0) {
        toast.error('Claim pool size must be greater than 0 when claim list is enabled');
        return;
      }

      const validClaims = claimEntries.filter(
        (c) => c.address.trim() !== '' && c.maxClaimable !== '0'
      );

      if (validClaims.length === 0) {
        toast.error('Add at least one claimant or disable claim list');
        return;
      }

      const totalMaxClaim = validClaims.reduce(
        (sum, c) => sum + (parseFloat(c.maxClaimable) || 0),
        0
      );

      // STRICT: Total max claimable must EXACTLY match pool size
      if (totalMaxClaim !== poolSize) {
        toast.error(
          `Claim list error: Total max claimable (${totalMaxClaim}) must exactly match pool size (${poolSize})`
        );
        return;
      }

      const claimValidation = validateClaimList(
        validClaims.map((c) => ({ ...c, id: '' })),
        claimPoolSize.toString()
      );

      if (!claimValidation.valid) {
        toast.error(`Claim List Error: ${claimValidation.error}`);
        return;
      }
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

      // 2. Costruzione dell'oggetto FragmaMintMetadataInput
      const metadataInput: FragmaMintMetadataInput = {
        asset_ref_id: metadata.asset_ref_id,
        attestation_sha256: metadata.attestation_sha256,
        admin_pkh: selectedPolicy.adminAddresses,

        // Mappa i campi di stato nel formato richiesto dal tipo FragmaRwaMapping
        ...((metadata.mappingCid || metadata.mappingUrl) && {
          mapping: {
            ...(metadata.mappingCid && { cid: metadata.mappingCid }),
            ...(metadata.mappingUrl && { url: metadata.mappingUrl }),
            ...(metadata.signatureCid &&
              metadata.signatureType && {
                signature: {
                  type: metadata.signatureType,
                  cid: metadata.signatureCid,
                },
              }),
          },
        }),
      };

      const result = await fluidMesh.mintPolicy(
        wallet,
        policyData,
        quantity,
        metadataInput,
        validAllocations.length > 0 ? validAllocations : undefined // Pass allocations
      );

      // Handle errors
      if (!result.success) {
        toast.error(result.error?.userMessage || 'Mint failed');
        return;
      }

      // Save claim list if enabled (Feature 2)
      if (enableClaimList && result.data?.txHash) {
        const validClaims = claimEntries.filter(
          (c) => c.address.trim() !== '' && c.maxClaimable !== '0'
        );

        const claimList: ClaimList = {
          id: uuidv4(),
          policyId: selectedPolicy.policyId,
          mintTxHash: result.data.txHash,
          totalClaimPool: claimPoolSize.toString(),
          claims: validClaims.map((c) => ({
            id: uuidv4(),
            address: c.address,
            maxClaimable: c.maxClaimable,
          })),
          createdAt: new Date().toISOString(),
          createdBy: address,
        };

        useClaimStore.getState().addClaimList(claimList);
        toast.info('Claim list saved successfully');
      }

      toast.success(
        `${SUCCESS_MESSAGES[FluidMeshSuccessCode.MINTING_SUCCESS]} TxHash: ${result.data?.txHash}`
      );

      // Reset form
      setQuantity('1');
      setMetadata(initialMetadataState);
      setRecipientAllocations([]);
      setEnableClaimList(false);
      setClaimPoolSize('0');
      setClaimEntries([]);
    } catch (error) {
      console.error('Mint error:', error);
      toast.error(
        `Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setMintLoading(false);
    }
  };

  const handleMetadataChange = (field: keyof MetadataState, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  // Modal states
  const [allocationsModalOpen, setAllocationsModalOpen] = useState(false);
  const [claimListModalOpen, setClaimListModalOpen] = useState(false);

  return (
    <div className='border-border bg-soft mx-auto max-w-xl space-y-4 rounded-4xl border p-6'>
      <h2 className='text-2xl font-bold'>Mint CIP113 Tokens</h2>

      <div className='space-y-4'>
        {/* Policy Selector */}
        <section className='space-y-3'>
          <Label>Selected Policy</Label>
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
                <span className='text-muted-foreground text-xs'>
                  Policy ID: {selectedPolicy.policyId.slice(0, 10)}...
                </span>
              </div>
            ) : (
              <span className='text-muted-foreground'>Select a policy</span>
            )}
          </Button>
        </section>

        {/* Quantity */}
        <section className='space-y-3'>
          <Label htmlFor='quantity'>Total Quantity to Mint</Label>
          <Input
            id='quantity'
            type='number'
            placeholder='1'
            value={quantity}
            className='bg-soft border-none text-lg font-semibold'
            onChange={(e) => setQuantity(e.target.value)}
            min='1'
          />
        </section>

        {/* Token Distribution Summary - Always visible when quantity > 0 */}
        {parseFloat(quantity) > 0 && (
          <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 rounded-xl border p-4 shadow-sm'>
            <h4 className='font-semibold mb-3 text-sm flex items-center gap-2'>
              <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
              </svg>
              Token Distribution
            </h4>
            <div className='space-y-2'>
              <div className='flex justify-between items-center text-sm'>
                <span className='text-muted-foreground'>Total Minting</span>
                <span className='font-bold text-lg'>{quantity}</span>
              </div>
              <div className='h-px bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent my-2'></div>

              {totalAllocated > 0 && (
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-muted-foreground flex items-center gap-1'>
                    <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                      <path d='M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' />
                    </svg>
                    Direct Recipients
                  </span>
                  <span className='font-semibold text-blue-600 dark:text-blue-400'>{totalAllocated}</span>
                </div>
              )}

              {claimPoolAmount > 0 && (
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-muted-foreground flex items-center gap-1'>
                    <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clipRule='evenodd' />
                    </svg>
                    Claim Pool
                  </span>
                  <span className='font-semibold text-purple-600 dark:text-purple-400'>{claimPoolAmount}</span>
                </div>
              )}

              <div className='h-px bg-gradient-to-r from-transparent via-blue-300 dark:via-blue-700 to-transparent my-2'></div>

              <div className='flex justify-between items-center text-sm bg-white/50 dark:bg-black/20 rounded-lg p-2'>
                <span className='font-medium flex items-center gap-1'>
                  <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                    <path fillRule='evenodd' d='M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z' clipRule='evenodd' />
                  </svg>
                  You receive
                </span>
                <span className={cn(
                  'font-bold text-lg',
                  remainingForMinter < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'
                )}>
                  {remainingForMinter}
                </span>
              </div>

              {remainingForMinter < 0 && (
                <div className='bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-2 mt-2'>
                  <p className='text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1'>
                    <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                      <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                    </svg>
                    Distribution exceeds minting quantity by {Math.abs(remainingForMinter)} tokens!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Distribution Actions */}
        <section className='space-y-3 pt-2'>
          <h3 className='text-sm font-medium text-muted-foreground'>Token Distribution (Optional)</h3>
          <div className='grid grid-cols-2 gap-3'>
            {/* Direct Allocations Card */}
            <button
              type='button'
              onClick={() => setAllocationsModalOpen(true)}
              className='border-border bg-background hover:bg-accent relative rounded-lg border p-4 text-left transition-colors'
            >
              <div className='flex items-start justify-between'>
                <div>
                  <h4 className='font-semibold text-sm mb-1'>Direct Recipients</h4>
                  <p className='text-xs text-muted-foreground'>
                    {recipientAllocations.length === 0
                      ? 'Not configured'
                      : `${recipientAllocations.length} recipient${recipientAllocations.length > 1 ? 's' : ''}`
                    }
                  </p>
                  {totalAllocated > 0 && (
                    <p className='text-sm font-bold text-blue-600 dark:text-blue-400 mt-2'>
                      {totalAllocated} tokens
                    </p>
                  )}
                </div>
                <svg className='w-5 h-5 text-muted-foreground' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' />
                </svg>
              </div>
              {recipientAllocations.length > 0 && (
                <div className='absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full'></div>
              )}
            </button>

            {/* Claim List Card */}
            <button
              type='button'
              onClick={() => setClaimListModalOpen(true)}
              className='border-border bg-background hover:bg-accent relative rounded-lg border p-4 text-left transition-colors'
            >
              <div className='flex items-start justify-between'>
                <div>
                  <h4 className='font-semibold text-sm mb-1'>Claim List</h4>
                  <p className='text-xs text-muted-foreground'>
                    {!enableClaimList
                      ? 'Disabled'
                      : `${claimEntries.length} claimant${claimEntries.length !== 1 ? 's' : ''}`
                    }
                  </p>
                  {claimPoolAmount > 0 && (
                    <p className='text-sm font-bold text-purple-600 dark:text-purple-400 mt-2'>
                      {claimPoolAmount} tokens
                    </p>
                  )}
                </div>
                <svg className='w-5 h-5 text-muted-foreground' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clipRule='evenodd' />
                </svg>
              </div>
              {enableClaimList && (
                <div className='absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full'></div>
              )}
            </button>
          </div>
        </section>

        {/* --- Sezione Metadata (Obbligatori) --- */}
        <div className='pt-4'>
          <h3 className='mb-3 text-lg font-semibold'>Metadata (Required)</h3>

          <div className='space-y-3'>
            {/* Asset Ref ID */}
            <div>
              <Label htmlFor='asset_ref_id'>Asset Reference ID (UUID v4)</Label>
              <Input
                id='asset_ref_id'
                placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                value={metadata.asset_ref_id}
                onChange={(e) =>
                  handleMetadataChange('asset_ref_id', e.target.value)
                }
                className='bg-soft border-none'
              />
            </div>

            {/* Attestation SHA256 */}
            <div>
              <Label htmlFor='attestation_sha256'>
                Attestation SHA-256 (64-hex)
              </Label>
              <Input
                id='attestation_sha256'
                placeholder='f7c3bc1d808e04732adf679965ccc34ca7ae3441a9f5ca6f8c1e2b3d4f5a6b7c'
                value={metadata.attestation_sha256}
                onChange={(e) =>
                  handleMetadataChange('attestation_sha256', e.target.value)
                }
                className='bg-soft border-none'
                maxLength={64}
              />
            </div>
          </div>
        </div>

        {/* --- Sezione Mapping (Opzionali) --- */}
        <div className='pt-4'>
          <h3 className='text-muted-foreground mb-3 text-lg font-semibold'>
            Mapping (Optional Pointers)
          </h3>

          <div className='space-y-3'>
            {/* Mapping CID */}
            <div>
              <Label htmlFor='mappingCid' className='text-muted-foreground'>
                Mapping IPFS CID
              </Label>
              <Input
                id='mappingCid'
                placeholder='ipfs://bafy...mapping'
                value={metadata.mappingCid}
                onChange={(e) =>
                  handleMetadataChange('mappingCid', e.target.value)
                }
                className='bg-soft border-none'
              />
            </div>

            {/* Mapping URL */}
            <div>
              <Label htmlFor='mappingUrl' className='text-muted-foreground'>
                Mapping HTTPS URL
              </Label>
              <Input
                id='mappingUrl'
                placeholder='https://yourdomain/...pdf'
                value={metadata.mappingUrl}
                onChange={(e) =>
                  handleMetadataChange('mappingUrl', e.target.value)
                }
                className='bg-soft border-none'
              />
            </div>

            {/* Signature Block */}
            <div className='border-border space-y-3 border-l-2 pt-2 pl-3'>
              <p className='text-muted-foreground text-sm font-medium'>
                Optional Signature
              </p>
              <div>
                <Label
                  htmlFor='signatureType'
                  className='text-muted-foreground text-xs'
                >
                  Signature Type (e.g., &apos;pgp&apos;)
                </Label>
                <Input
                  id='signatureType'
                  placeholder='pgp'
                  value={metadata.signatureType}
                  onChange={(e) =>
                    handleMetadataChange('signatureType', e.target.value)
                  }
                  className='bg-soft border-none'
                />
              </div>
              <div>
                <Label
                  htmlFor='signatureCid'
                  className='text-muted-foreground text-xs'
                >
                  Signature IPFS CID
                </Label>
                <Input
                  id='signatureCid'
                  placeholder='ipfs://bafy...mapping.asc'
                  value={metadata.signatureCid}
                  onChange={(e) =>
                    handleMetadataChange('signatureCid', e.target.value)
                  }
                  className='bg-soft border-none'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mint Button and Messages */}
        <div className='flex gap-3 pt-4'>
          <Button
            onClick={handleMint}
            loading={mintLoading}
            disabled={
              mintLoading ||
              !wallet ||
              !selectedPolicy ||
              !metadata.asset_ref_id ||
              !metadata.attestation_sha256
            }
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

      {/* Direct Allocations Modal */}
      <Dialog open={allocationsModalOpen} onOpenChange={setAllocationsModalOpen}>
        <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Direct Token Allocations</DialogTitle>
            <DialogDescription>
              Specify addresses to receive tokens directly upon minting. The remaining tokens will be sent to your address.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 mt-4'>
            {recipientAllocations.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                <svg className='w-12 h-12 mx-auto mb-3 opacity-50' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                </svg>
                <p className='text-sm'>No recipients configured yet</p>
                <p className='text-xs mt-1'>Click below to add your first recipient</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {recipientAllocations.map((allocation, index) => (
                  <div key={index} className='border-border bg-soft rounded-lg border p-4'>
                    <div className='flex items-start justify-between mb-3'>
                      <span className='text-xs font-medium text-muted-foreground'>
                        Recipient #{index + 1}
                      </span>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeRecipientRow(index)}
                        className='text-red-500 h-6 px-2 -mt-1'
                      >
                        Remove
                      </Button>
                    </div>
                    <div className='space-y-3'>
                      <div>
                        <Label className='text-xs mb-1'>Cardano Address</Label>
                        <Input
                          placeholder='addr1... or addr_test...'
                          value={allocation.address}
                          onChange={(e) =>
                            updateRecipientAllocation(index, 'address', e.target.value)
                          }
                          className={cn(
                            'bg-background',
                            allocationErrors.has(index) && 'border-red-500 border-2'
                          )}
                        />
                        {allocationErrors.has(index) && (
                          <p className='text-xs text-red-500 mt-1 flex items-center gap-1'>
                            <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                              <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                            </svg>
                            {allocationErrors.get(index)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className='text-xs mb-1'>Quantity</Label>
                        <Input
                          type='number'
                          placeholder='0'
                          value={allocation.quantity}
                          onChange={(e) =>
                            updateRecipientAllocation(index, 'quantity', e.target.value)
                          }
                          className='bg-background'
                          min='1'
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type='button'
              variant='outline'
              onClick={addRecipientRow}
              className='w-full'
            >
              <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
              </svg>
              Add Recipient
            </Button>

            {recipientAllocations.length > 0 && (
              <div className='bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 rounded-lg border p-4 mt-4'>
                <h4 className='font-semibold text-sm mb-2'>Summary</h4>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Total Allocated:</span>
                    <span className='font-semibold text-blue-600 dark:text-blue-400'>{totalAllocated}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Recipients:</span>
                    <span className='font-semibold'>{recipientAllocations.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim List Modal */}
      <Dialog open={claimListModalOpen} onOpenChange={setClaimListModalOpen}>
        <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Claim List Configuration</DialogTitle>
            <DialogDescription>
              Reserve a pool of tokens for future claiming. Define who can claim and how much (stored in localStorage).
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 mt-4'>
            {/* Enable/Disable Toggle */}
            <div className='bg-soft rounded-lg border p-4 flex items-start gap-3'>
              <Checkbox
                id='enableClaimListModal'
                checked={enableClaimList}
                onCheckedChange={(checked) => setEnableClaimList(checked === true)}
              />
              <div className='flex-1'>
                <Label
                  htmlFor='enableClaimListModal'
                  className='font-semibold cursor-pointer'
                >
                  Enable Claim List
                </Label>
                <p className='text-xs text-muted-foreground mt-1'>
                  When enabled, a portion of tokens will be reserved for claiming
                </p>
              </div>
            </div>

            {enableClaimList && (
              <>
                {/* Claim Pool Size */}
                <div>
                  <Label htmlFor='claimPoolSizeModal' className='mb-2 block'>
                    Claim Pool Size
                  </Label>
                  <Input
                    id='claimPoolSizeModal'
                    type='number'
                    placeholder='0'
                    value={claimPoolSize}
                    onChange={(e) => setClaimPoolSize(e.target.value)}
                    className='bg-background text-lg font-semibold'
                    min='0'
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    Total tokens to reserve for claiming (will be sent to claim smart contract)
                  </p>
                </div>

                {/* Claimants List */}
                <div className='border-t pt-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='font-semibold text-sm'>
                      Claimants ({claimPoolAmount} tokens available)
                    </h4>
                  </div>

                  {claimEntries.length === 0 ? (
                    <div className='text-center py-8'>
                      {claimPoolAmount > 0 ? (
                        <div className='bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 rounded-lg border p-6'>
                          <svg className='w-12 h-12 mx-auto mb-3 text-yellow-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                          </svg>
                          <p className='text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1'>
                            {claimPoolAmount} tokens need distribution!
                          </p>
                          <p className='text-xs text-yellow-700 dark:text-yellow-300'>
                            Add claimants below to distribute all tokens in the pool
                          </p>
                        </div>
                      ) : (
                        <div className='text-muted-foreground'>
                          <svg className='w-12 h-12 mx-auto mb-3 opacity-50' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                          </svg>
                          <p className='text-sm'>No claimants defined yet</p>
                          <p className='text-xs mt-1'>Add addresses that will be eligible to claim</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {claimEntries.map((entry, index) => (
                        <div key={index} className='border-border bg-soft rounded-lg border p-4'>
                          <div className='flex items-start justify-between mb-3'>
                            <span className='text-xs font-medium text-muted-foreground'>
                              Claimant #{index + 1}
                            </span>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={() => removeClaimRow(index)}
                              className='text-red-500 h-6 px-2 -mt-1'
                            >
                              Remove
                            </Button>
                          </div>
                          <div className='space-y-3'>
                            <div>
                              <Label className='text-xs mb-1'>Cardano Address</Label>
                              <Input
                                placeholder='addr1... or addr_test...'
                                value={entry.address}
                                onChange={(e) =>
                                  updateClaimEntry(index, 'address', e.target.value)
                                }
                                className={cn(
                                  'bg-background',
                                  claimErrors.has(index) && 'border-red-500 border-2'
                                )}
                              />
                              {claimErrors.has(index) && (
                                <p className='text-xs text-red-500 mt-1 flex items-center gap-1'>
                                  <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                                    <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                                  </svg>
                                  {claimErrors.get(index)}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className='text-xs mb-1'>Max Claimable Amount</Label>
                              <Input
                                type='number'
                                placeholder='0'
                                value={entry.maxClaimable}
                                onChange={(e) =>
                                  updateClaimEntry(index, 'maxClaimable', e.target.value)
                                }
                                className='bg-background'
                                min='1'
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type='button'
                    variant='outline'
                    onClick={addClaimRow}
                    className='w-full mt-3'
                  >
                    <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                    </svg>
                    Add Claimant
                  </Button>

                  {claimEntries.length > 0 && (
                    <div className={cn(
                      'rounded-lg border p-4 mt-4',
                      totalMaxClaimable === claimPoolAmount
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : totalMaxClaimable > claimPoolAmount
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                        : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
                    )}>
                      <h4 className='font-semibold text-sm mb-2 flex items-center gap-2'>
                        {totalMaxClaimable === claimPoolAmount ? (
                          <>
                            <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                            </svg>
                            Distribution Complete
                          </>
                        ) : (
                          <>
                            <svg className='w-4 h-4 text-yellow-600' fill='currentColor' viewBox='0 0 20 20'>
                              <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                            </svg>
                            Distribution Summary
                          </>
                        )}
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between items-center'>
                          <span className='text-muted-foreground'>Claim Pool Size:</span>
                          <span className='font-bold text-lg'>{claimPoolAmount}</span>
                        </div>
                        <div className='h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent'></div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>Total Max Claimable:</span>
                          <span className={cn(
                            'font-semibold',
                            totalMaxClaimable === claimPoolAmount && 'text-green-600 dark:text-green-400',
                            totalMaxClaimable > claimPoolAmount && 'text-red-600 dark:text-red-400',
                            totalMaxClaimable < claimPoolAmount && 'text-yellow-600 dark:text-yellow-500'
                          )}>
                            {totalMaxClaimable}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>Claimants:</span>
                          <span className='font-semibold'>{claimEntries.length}</span>
                        </div>
                        <div className='flex justify-between items-center pt-2 border-t'>
                          <span className='font-medium'>Remaining to Distribute:</span>
                          <span className={cn(
                            'font-bold text-lg',
                            claimPoolAmount - totalMaxClaimable === 0 && 'text-green-600 dark:text-green-400',
                            claimPoolAmount - totalMaxClaimable < 0 && 'text-red-600 dark:text-red-400',
                            claimPoolAmount - totalMaxClaimable > 0 && 'text-yellow-600 dark:text-yellow-500'
                          )}>
                            {claimPoolAmount - totalMaxClaimable}
                          </span>
                        </div>

                        {totalMaxClaimable !== claimPoolAmount && (
                          <div className={cn(
                            'border rounded-lg p-2 mt-2',
                            totalMaxClaimable > claimPoolAmount
                              ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
                          )}>
                            <p className={cn(
                              'text-xs font-medium flex items-center gap-1',
                              totalMaxClaimable > claimPoolAmount
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-yellow-700 dark:text-yellow-500'
                            )}>
                              <svg className='w-3 h-3 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                                <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                              </svg>
                              {totalMaxClaimable > claimPoolAmount ? (
                                <>Over-allocated by {totalMaxClaimable - claimPoolAmount} tokens. Reduce claimable amounts.</>
                              ) : (
                                <>You must distribute ALL {claimPoolAmount} tokens. Add {claimPoolAmount - totalMaxClaimable} more to claimants.</>
                              )}
                            </p>
                          </div>
                        )}

                        {totalMaxClaimable === claimPoolAmount && (
                          <div className='bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-2 mt-2'>
                            <p className='text-xs text-green-700 dark:text-green-400 font-medium flex items-center gap-1'>
                              <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                              </svg>
                              Perfect! All {claimPoolAmount} tokens are allocated.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MintForm;
