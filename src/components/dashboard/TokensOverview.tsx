'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/store/walletStore';
import { usePolicyStore } from '@/store/policyStore';
import { getFluidMesh } from '@/lib/FluidMesh';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Flame } from 'lucide-react';
import { Policy } from '@/types/general';
import { TransferTokenModal } from '@/components/modals/TransferTokenModal';
import { BurnTokenModal } from '@/components/modals/BurnTokenModal';
import { toast } from 'sonner';
import { deserializeAddress } from '@meshsdk/core';

type TokenData = {
  unit: string;
  quantity: string;
  assetName: string;
  assetNameDecoded: string;
  utxoHash: string;
  utxoIndex: number;
};

type AggregatedToken = {
  assetName: string;
  assetNameDecoded: string;
  totalQuantity: string;
  policyId: string;
  policy: Policy;
  utxos: { quantity: string; utxoHash: string; utxoIndex: number }[];
};

type PolicyTokens = {
  tokens: TokenData[];
  tokenName: string;
};

function TokensOverview() {
  const { wallet, address } = useWallet();
  const { policies } = usePolicyStore();

  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [burnLoading, setBurnLoading] = useState(false);
  const [tokensMap, setTokensMap] = useState<Map<string, PolicyTokens>>(
    new Map()
  );
  const [selectedToken, setSelectedToken] = useState<AggregatedToken | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [burnModalOpen, setBurnModalOpen] = useState(false);

  const fetchTokens = async () => {
    if (!address || policies.length === 0) return;

    setLoading(true);
    try {
      const fluidMesh = getFluidMesh();

      const policiesData = policies.map((p) => ({
        policyId: p.policyId,
        scriptCbor: p.scriptCbor,
        tokenName: p.tokenName,
      }));

      const result = await fluidMesh.getAllCIP113TokensForWallet(
        address,
        policiesData
      );

      if (result.success && result.data) {
        setTokensMap(result.data);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && policies.length > 0) {
      fetchTokens();
    }
  }, [address, policies.length]);

  // Check if current user is admin of a policy
  const isUserAdminOfPolicy = (policy: Policy): boolean => {
    if (!address) return false;
    return policy.adminAddresses.some(
      (adminAddr) => adminAddr.toLowerCase() === address.toLowerCase()
    );
  };

  // Aggregate tokens by policy and asset name
  const aggregatedTokens: AggregatedToken[] = [];
  tokensMap.forEach((policyData, policyId) => {
    const policy = policies.find((p) => p.policyId === policyId);
    if (!policy) return;

    const tokensByAsset = new Map<
      string,
      { total: bigint; utxos: { quantity: string; utxoHash: string; utxoIndex: number }[] }
    >();

    policyData.tokens.forEach((token) => {
      const current = tokensByAsset.get(token.assetName) || {
        total: BigInt(0),
        utxos: [],
      };
      tokensByAsset.set(token.assetName, {
        total: current.total + BigInt(token.quantity),
        utxos: [
          ...current.utxos,
          {
            quantity: token.quantity,
            utxoHash: token.utxoHash,
            utxoIndex: token.utxoIndex,
          },
        ],
      });
    });

    tokensByAsset.forEach((data, assetName) => {
      const token = policyData.tokens.find((t) => t.assetName === assetName);
      if (token) {
        aggregatedTokens.push({
          assetName,
          assetNameDecoded: token.assetNameDecoded,
          totalQuantity: data.total.toString(),
          policyId,
          policy,
          utxos: data.utxos,
        });
      }
    });
  });

  if (!wallet || !address) {
    return (
      <div className='border-border bg-soft rounded-4xl border p-6'>
        <p className='text-muted-foreground text-center'>
          Connect your wallet to view your CIP113 tokens
        </p>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className='border-border bg-soft rounded-4xl border p-6'>
        <p className='text-muted-foreground text-center'>
          No policies found. Create a policy first to mint tokens.
        </p>
      </div>
    );
  }

  return (
    <div className='border-border bg-soft rounded-4xl border p-6'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>Your CIP113 Tokens</h2>
        <Button
          onClick={fetchTokens}
          disabled={loading}
          variant='outline'
          size='sm'
        >
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Loading...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {loading && tokensMap.size === 0 ? (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      ) : aggregatedTokens.length === 0 ? (
        <p className='text-muted-foreground py-8 text-center'>
          No CIP113 tokens found in your wallet
        </p>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {aggregatedTokens.map((token) => (
            <div
              key={`${token.policyId}-${token.assetName}`}
              className='border-border hover:border-primary group rounded-lg border p-4 transition-colors'
            >
              <div className='mb-3'>
                <h3 className='text-lg font-bold'>{token.assetNameDecoded}</h3>
                <p className='text-muted-foreground text-sm'>
                  {token.policy.tokenName}
                </p>
                <p className='text-muted-foreground mt-1 text-xs font-mono'>
                  {token.policyId.slice(0, 16)}...
                </p>
              </div>

              <div className='mb-4'>
                <p className='text-3xl font-bold'>{token.totalQuantity}</p>
                <p className='text-muted-foreground text-sm'>tokens</p>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <Button
                  onClick={() => {
                    setSelectedToken(token);
                    setModalOpen(true);
                  }}
                  className='w-full'
                  size='sm'
                  variant='default'
                >
                  <Send className='mr-2 h-4 w-4' />
                  Transfer
                </Button>
                <div className='relative w-full'>
                  <Button
                    onClick={() => {
                      if (isUserAdminOfPolicy(token.policy)) {
                        setSelectedToken(token);
                        setBurnModalOpen(true);
                      }
                    }}
                    className='w-full'
                    size='sm'
                    variant='destructive'
                    disabled={!isUserAdminOfPolicy(token.policy)}
                    title={
                      !isUserAdminOfPolicy(token.policy)
                        ? 'Only policy admins can burn tokens'
                        : undefined
                    }
                  >
                    <Flame className='mr-2 h-4 w-4' />
                    Burn
                  </Button>
                  {!isUserAdminOfPolicy(token.policy) && (
                    <div className='absolute -bottom-5 left-0 right-0'>
                      <p className='text-xs text-muted-foreground text-center'>
                        Admin only
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TransferTokenModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSelectedToken(null);
        }}
        token={selectedToken}
        onTransfer={async (recipientAddress, amount) => {
          if (!selectedToken || !wallet || !address) return;

          setTransferLoading(true);
          try {
            const fluidMesh = getFluidMesh();

            // Select UTxO(s) to use
            const selectedUtxos = fluidMesh.selectUtxoForTransfer(
              selectedToken.utxos,
              amount
            );

            if (!selectedUtxos) {
              toast.error(
                'Insufficient balance. Cannot find enough UTxOs for this transfer.'
              );
              return;
            }

            // Get signer hash
            const signerHash = deserializeAddress(address).pubKeyHash;

            // Build policy data
            const policyData = {
              tokenName: selectedToken.policy.tokenName,
              tokenNameHex: selectedToken.policy.tokenNameHex,
              signerHash,
              ruleScript: {
                scriptCbor: selectedToken.policy.ruleScriptCbor,
                scriptAddr: '',
                policy: selectedToken.policy.ruleScriptPolicy,
                rewardAddress: selectedToken.policy.ruleScriptRewardAddress,
              },
              smartToken: {
                scriptCbor: selectedToken.policy.scriptCbor,
                scriptAddr: '',
                policy: selectedToken.policy.policyId,
                rewardAddress: selectedToken.policy.smartTokenRewardAddress,
              },
              smartReceiverAddress: '',
            };

            // Transfer tokens
            const result = await fluidMesh.transferCIP113Tokens(
              wallet,
              policyData,
              recipientAddress,
              amount,
              selectedUtxos.utxos,
              selectedUtxos.balance
            );

            if (!result.success) {
              toast.error(result.error?.userMessage || 'Transfer failed');
              return;
            }

            toast.success(`Transfer successful! TxHash: ${result.data?.txHash}`);
            setModalOpen(false);

            // Refresh tokens
            await fetchTokens();
          } catch (error) {
            console.error('Transfer error:', error);
            toast.error(
              `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          } finally {
            setTransferLoading(false);
          }
        }}
        loading={transferLoading}
      />

      <BurnTokenModal
        open={burnModalOpen}
        onOpenChange={(open) => {
          setBurnModalOpen(open);
          if (!open) setSelectedToken(null);
        }}
        token={selectedToken}
        onBurn={async (amount) => {
          if (!selectedToken || !wallet || !address) return;

          setBurnLoading(true);
          try {
            const fluidMesh = getFluidMesh();

            // Select UTxO(s) to use
            const selectedUtxos = fluidMesh.selectUtxoForTransfer(
              selectedToken.utxos,
              amount
            );

            if (!selectedUtxos) {
              toast.error(
                'Insufficient balance. Cannot find enough UTxOs for this burn.'
              );
              return;
            }

            // Get signer hash
            const signerHash = deserializeAddress(address).pubKeyHash;

            // Build policy data
            const policyData = {
              tokenName: selectedToken.policy.tokenName,
              tokenNameHex: selectedToken.policy.tokenNameHex,
              signerHash,
              ruleScript: {
                scriptCbor: selectedToken.policy.ruleScriptCbor,
                scriptAddr: '',
                policy: selectedToken.policy.ruleScriptPolicy,
                rewardAddress: selectedToken.policy.ruleScriptRewardAddress,
              },
              smartToken: {
                scriptCbor: selectedToken.policy.scriptCbor,
                scriptAddr: '',
                policy: selectedToken.policy.policyId,
                rewardAddress: selectedToken.policy.smartTokenRewardAddress,
              },
              smartReceiverAddress: '',
            };

            // Burn tokens
            const result = await fluidMesh.burnCIP113Tokens(
              wallet,
              policyData,
              amount,
              selectedUtxos.utxos,
              selectedUtxos.balance
            );

            if (!result.success) {
              toast.error(result.error?.userMessage || 'Burn failed');
              return;
            }

            toast.success(`Burn successful! TxHash: ${result.data?.txHash}`);
            setBurnModalOpen(false);

            // Refresh tokens
            await fetchTokens();
          } catch (error) {
            console.error('Burn error:', error);
            toast.error(
              `Burn failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          } finally {
            setBurnLoading(false);
          }
        }}
        loading={burnLoading}
      />
    </div>
  );
}

export default TokensOverview;
