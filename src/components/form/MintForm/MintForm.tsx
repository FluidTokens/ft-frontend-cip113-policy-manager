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
import { FragmaMintMetadataInput, Policy } from '@/types/general';
import { deserializeAddress } from '@meshsdk/core';
import { Label } from '@/components/ui/label'; // Aggiunto Label di shadcn

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

    // Validazione dei campi essenziali del metadata
    if (!metadata.asset_ref_id || !metadata.attestation_sha256) {
      toast.error('Asset Reference ID and Attestation Hash are required.');
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

      // 2. Costruzione dell'oggetto FragmaMintMetadataInput
      const metadataInput: FragmaMintMetadataInput = {
        asset_ref_id: metadata.asset_ref_id,
        attestation_sha256: metadata.attestation_sha256,
        total_supply: parseInt(quantity),
        decimals: 1,
        admin_pkh: selectedPolicy.adminAddresses,
        initial_allocations: [
          {
            label: 'Team allocation',
            address: smartReceiverAddress.match(/.{1,64}/g),
            amount: parseInt(quantity),
          },
        ],

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
      } as FragmaMintMetadataInput; // Aggiungo un cast per placare l'errore di tipi mancanti (total_supply, ecc.)

      const result = await fluidMesh.mintPolicy(
        wallet,
        policyData,
        quantity,
        metadataInput
      );

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
      setMetadata(initialMetadataState); // Resetta anche i campi metadata
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
          <Label htmlFor='quantity'>Quantity</Label>
          <Input
            id='quantity'
            type='number'
            placeholder='1'
            value={quantity}
            className='bg-soft border-none'
            onChange={(e) => setQuantity(e.target.value)}
            min='1'
          />
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
    </div>
  );
}

export default MintForm;
