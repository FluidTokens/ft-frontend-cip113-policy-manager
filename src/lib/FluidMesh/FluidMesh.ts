import { maestroKey, maestroNetwork } from "@/config/mesh";
import {
  MaestroProvider,
  MaestroSupportedNetworks,
  MeshTxBuilder,
  BrowserWallet,
  deserializeAddress,
  resolveScriptHash,
  serializeRewardAddress,
  serializePlutusScript,
  mConStr0,
  mConStr1,
  PlutusScript,
  deserializeDatum,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import blueprint from "@/config/plutus.json";
import type { Cip113PolicyConfig, PolicyCreationResult, Cip113PolicyData } from "./types";
import {
  FluidMeshError,

  FluidMeshSuccessCode,
  FluidMeshResult,
  createSuccessResult,
  createErrorResult,
} from "./errors";
import { getCollateral } from "@/lib/FluidMesh/utils";
import { FragmaMintMetadataInput, FragmaRwaMintMetadata } from "@/types/general";

/**
 * FluidMesh class - Manages blockchain interactions for CIP113 policies
 */
class FluidMesh {
  private blockchainProvider: MaestroProvider;
  private networkId: 0 | 1;

  constructor() {
    this.blockchainProvider = new MaestroProvider({
      network: maestroNetwork as MaestroSupportedNetworks,
      apiKey: maestroKey,
    });
    this.networkId = maestroNetwork === "Preview" ? 0 : 1;
  }

  /**
   * Get the Maestro blockchain provider
   */
  getProvider(): MaestroProvider {
    return this.blockchainProvider;
  }

  /**
   * Get network ID (0 for testnet, 1 for mainnet)
   */
  getNetworkId(): number {
    return this.networkId;
  }

  /**
   * Get transaction builder
   */
  getTxBuilder(): MeshTxBuilder {
    return new MeshTxBuilder({
      fetcher: this.blockchainProvider,
      evaluator: this.blockchainProvider,
      submitter: this.blockchainProvider,
      verbose: true,
    });
  }

  /**
   * Get rule script (withdraw validator) with parameters
   * @param blacklist - Blacklist linked list (empty string if not enabled)
   * @param whitelist - Whitelist linked list (empty string if not enabled)
   * @param admins - List of admin public key hashes
   */
  getRuleScript(blacklist: string, whitelist: string, admins: string[]) {
    const ruleValidator = blueprint.validators.find(
      (v) => v.title === "rule.rules.withdraw"
    );

    if (!ruleValidator) {
      throw new Error("Rule validator not found in blueprint");
    }

    const scriptCbor = applyParamsToScript(ruleValidator.compiledCode, [
      blacklist,
      whitelist,
      admins,
    ]);

    const scriptAddr = serializePlutusScript(
      { code: scriptCbor, version: "V3" },
      undefined,
      this.networkId
    ).address;

    const policy = resolveScriptHash(scriptCbor, "V3");

    const rewardAddress = serializeRewardAddress(policy, true, this.networkId);

    return { scriptCbor, scriptAddr, policy, rewardAddress };
  }

  /**
   * Get CIP113 policy (mint validator) with parameters
   * @param tokenNameHex - Token name in hex format
   * @param rulePolicy - Policy hash from rule script
   */
  getCIP113Policy(tokenNameHex: string, rulePolicy: string) {
    const mintValidator = blueprint.validators.find(
      (v) => v.title === "cip113.smart_token.mint"
    );

    if (!mintValidator) {
      throw new Error("CIP113 mint validator not found in blueprint");
    }

    const scriptCbor = applyParamsToScript(mintValidator.compiledCode, [
      tokenNameHex,
      rulePolicy,
    ]);

    const scriptAddr = serializePlutusScript(
      { code: scriptCbor, version: "V3" },
      undefined,
      this.networkId
    ).address;

    const policy = resolveScriptHash(scriptCbor, "V3");

    const rewardAddress = serializeRewardAddress(policy, true, this.networkId);

    return { scriptCbor, scriptAddr, policy, rewardAddress };
  }

  /**
   * Get smart contract address for a receiver
   * @param cbor - Script CBOR
   * @param hash - Public key hash
   * @param smartContract - Whether it's a smart contract address
   */
  getSmartReceiverAddress(
    cbor: string,
    hash: string,
    smartContract: boolean = false
  ): string {
    const scriptreal: PlutusScript = {
      code: cbor,
      version: "V3",
    };

    const { address: scriptAddress } = serializePlutusScript(
      scriptreal,
      hash,
      this.networkId,
      smartContract
    );

    return scriptAddress;
  }

  /**
   * Create CIP113 policy data from configuration
   * This prepares all necessary scripts and addresses
   */
  async createPolicyData(
    config: Cip113PolicyConfig,
    walletAddress: string
  ): Promise<Cip113PolicyData> {
    try {
      // Get signer hash from wallet address
      const signerHash = deserializeAddress(walletAddress).pubKeyHash;

      // Prepare blacklist and whitelist (empty if not enabled)
      const blacklist = config.blackList ? "" : "";
      const whitelist = config.whiteList ? "" : "";

      // Get admin hashes (convert addresses to pubKeyHash)
      const admins = config.adminAddresses.map(
        (addr) => deserializeAddress(addr).pubKeyHash
      );

      // Get rule script
      const ruleScript = this.getRuleScript(blacklist, whitelist, admins);

      // Convert token name to hex
      const tokenNameHex = Buffer.from(config.tokenName, "utf8").toString(
        "hex"
      );

      // Get CIP113 policy script
      const smartToken = this.getCIP113Policy(tokenNameHex, ruleScript.policy);

      // Get smart receiver address
      const smartReceiverAddress = this.getSmartReceiverAddress(
        smartToken.scriptCbor,
        signerHash,
        false
      );

      return {
        tokenName: config.tokenName,
        tokenNameHex,
        signerHash,
        ruleScript,
        smartToken,
        smartReceiverAddress,
      };
    } catch (error) {
      console.error("Error creating policy data:", error);
      throw error;
    }
  }

  /**
   * Check if a stake credential is already registered
   */
  async isStakeCredentialRegistered(rewardAddress: string): Promise<boolean> {
    try {
      const accountInfo = await this.blockchainProvider.fetchAccountInfo(rewardAddress);
      // If we get account info back, the credential is registered
      return accountInfo !== null && accountInfo !== undefined;
    } catch (error) {
      // If the account doesn't exist, it will throw or return null
      return false;
    }
  }

  /**
   * Deploy (register) stake certificates for rule and smart token
   * This must be done before minting
   * Skips registration if credentials are already registered
   */
  async deployPolicy(
    wallet: BrowserWallet,
    policyData: Cip113PolicyData
  ): Promise<FluidMeshResult<{ txHash: string; successCode: FluidMeshSuccessCode }>> {
    try {
      const utxos = await wallet.getUtxos();
      const walletAddress = await wallet.getChangeAddress();

      // Check if credentials are already registered
      const isRuleRegistered = await this.isStakeCredentialRegistered(
        policyData.ruleScript.rewardAddress
      );
      const isSmartTokenRegistered = await this.isStakeCredentialRegistered(
        policyData.smartToken.rewardAddress
      );

      const txBuilder = this.getTxBuilder();

      // Only register if not already registered
      if (!isRuleRegistered) {
        txBuilder.registerStakeCertificate(policyData.ruleScript.rewardAddress);
      }
      if (!isSmartTokenRegistered) {
        txBuilder.registerStakeCertificate(policyData.smartToken.rewardAddress);
      }

      // If both are already registered, we don't need to submit a transaction
      if (isRuleRegistered && isSmartTokenRegistered) {
        console.log("Both stake credentials already registered, skipping deployment");
        return createSuccessResult(
          { txHash: "", successCode: FluidMeshSuccessCode.CREDENTIALS_ALREADY_REGISTERED },
          FluidMeshSuccessCode.CREDENTIALS_ALREADY_REGISTERED
        );
      }

      await txBuilder
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .setNetwork(maestroNetwork as 'preview' | 'mainnet')
        .complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx, true);
      const txHash = await wallet.submitTx(signedTx);

      return createSuccessResult(
        { txHash, successCode: FluidMeshSuccessCode.DEPLOYMENT_SUCCESS },
        FluidMeshSuccessCode.DEPLOYMENT_SUCCESS
      );
    } catch (error) {
      console.error("Error deploying policy:", error);
      const fluidError = FluidMeshError.fromError(error);
      return createErrorResult(fluidError);
    }
  }

  /**
   * Mint CIP113 tokens
   * @param wallet - Browser wallet for signing
   * @param policyData - Policy data from createPolicyData
   * @param quantity - Amount to mint
   * @param metadata - Metadata for the mint
   * @param recipientAllocations - Optional allocations to mint directly to recipients
   */
  async mintPolicy(
    wallet: BrowserWallet,
    policyData: Cip113PolicyData,
    quantity: string,
    metadata: FragmaMintMetadataInput,
    recipientAllocations?: { address: string; quantity: string }[]
  ): Promise<FluidMeshResult<{ txHash: string }>> {
    try {
      const utxos = await wallet.getUtxos();
      const walletAddress = await wallet.getChangeAddress();

      const txBuilder = this.getTxBuilder();

      const collateral = await getCollateral(wallet, walletAddress)

      // Calculate allocations and remaining
      const allocations = recipientAllocations && recipientAllocations.length > 0
        ? recipientAllocations
        : null;

      // Calculate total allocated to recipients
      const totalAllocated = allocations
        ? allocations.reduce((acc, curr) => acc + BigInt(curr.quantity), BigInt(0))
        : BigInt(0);

      // Remaining goes to minter (signerHash)
      const remainingForMinter = BigInt(quantity) - totalAllocated;

      // Validate allocations don't exceed total
      if (totalAllocated > BigInt(quantity)) {
        throw new Error('Total allocations exceed minting quantity');
      }

      // Build accurate initial_allocations for metadata
      const initialAllocations: Array<{
        label: string;
        address: string[];
        amount: number;
      }> = [];

      // Add each recipient
      if (allocations) {
        for (const allocation of allocations) {
          const recipientHash = deserializeAddress(allocation.address).pubKeyHash;
          const recipientSmartAddress = this.getSmartReceiverAddress(
            policyData.smartToken.scriptCbor,
            recipientHash,
            false
          );

          initialAllocations.push({
            label: `Allocation to ${allocation.address.slice(0, 10)}...`,
            address: recipientSmartAddress.match(/.{1,64}/g) || [],
            amount: parseInt(allocation.quantity),
          });
        }
      }

      // Add minter if remaining
      if (remainingForMinter > 0) {
        initialAllocations.push({
          label: 'Minter allocation',
          address: policyData.smartReceiverAddress.match(/.{1,64}/g) || [],
          amount: parseInt(remainingForMinter.toString()),
        });
      }

      const rwaMetadata: FragmaRwaMintMetadata['777'] = {
        fragma_rwa_v1: {
          policy: policyData.smartToken.policy,
          assetName: policyData.tokenNameHex,
          rule_script_policy_hash: policyData.ruleScript.policy, // Preso dalla policy
          asset_ref_id: metadata.asset_ref_id,
          attestation_sha256: metadata.attestation_sha256,
          mapping: metadata.mapping,
          tokenomics: {
            total_supply: Number(quantity),
            decimals: 1,
            minting_policy_hash: policyData.smartToken.policy,
            admin_pkh: metadata.admin_pkh.map(
              (addr) => deserializeAddress(addr).pubKeyHash
            ),
            initial_allocations: initialAllocations
          }
        }
      };

      console.log(rwaMetadata)

      // Build transaction
      // Mint to each recipient's smart receiver address
      if (allocations) {
        for (const allocation of allocations) {
          const recipientHash = deserializeAddress(allocation.address).pubKeyHash;
          const recipientSmartAddress = this.getSmartReceiverAddress(
            policyData.smartToken.scriptCbor,
            recipientHash,
            false
          );

          txBuilder.txOut(recipientSmartAddress, [
            {
              unit: policyData.smartToken.policy + policyData.tokenNameHex,
              quantity: allocation.quantity,
            },
          ]);
        }
      }

      // Mint remaining to minter's smart receiver address
      if (remainingForMinter > 0) {
        txBuilder.txOut(policyData.smartReceiverAddress, [
          {
            unit: policyData.smartToken.policy + policyData.tokenNameHex,
            quantity: remainingForMinter.toString(),
          },
        ]);
      }

      txBuilder.requiredSignerHash(policyData.signerHash)
        .mintPlutusScriptV3()
        .mint(
          quantity,
          policyData.smartToken.policy,
          policyData.tokenNameHex
        )
        .metadataValue(777, rwaMetadata)
        .mintingScript(policyData.smartToken.scriptCbor)
        .mintRedeemerValue(mConStr0(["mesh"]))
        .withdrawalPlutusScriptV3()
        .withdrawal(policyData.ruleScript.rewardAddress, "0")
        .withdrawalScript(policyData.ruleScript.scriptCbor)
        .withdrawalRedeemerValue(mConStr0([]))
        .txInCollateral(collateral.txHash, collateral.outputIndex)
        .selectUtxosFrom(utxos)
        .changeAddress(walletAddress)
        .setNetwork(maestroNetwork as 'preview' | 'mainnet')



      await txBuilder.complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx);
      const txHash = await wallet.submitTx(signedTx);

      return createSuccessResult(
        { txHash },
        FluidMeshSuccessCode.MINTING_SUCCESS
      );
    } catch (error) {
      console.error("Error minting policy:", error);
      const fluidError = FluidMeshError.fromError(error);
      return createErrorResult(fluidError);
    }
  }



  /**
   * Convert hex asset name to UTF-8 string
   * @param assetNameHex - Asset name in hex format
   * @returns UTF-8 string representation
   */
  hexToString(assetNameHex: string): string {
    try {
      if (!assetNameHex) return '';
      return Buffer.from(assetNameHex, 'hex').toString('utf8');
    } catch {
      return assetNameHex; // Return hex if conversion fails
    }
  }

  /**
   * Get CIP113 tokens for a specific smart receiver address
   * @param smartReceiverAddress - The smart receiver address to check
   * @returns List of CIP113 tokens with their quantities and UTxO info
   */
  async getCIP113TokensForAddress(
    smartReceiverAddress: string
  ): Promise<FluidMeshResult<{ unit: string; quantity: string; policyId: string; assetName: string; assetNameDecoded: string; utxoHash: string; utxoIndex: number, metadata?: string }[]>> {
    try {
      const utxos = await this.blockchainProvider.fetchAddressUTxOs(smartReceiverAddress);

      const tokens: { unit: string; quantity: string; policyId: string; assetName: string; assetNameDecoded: string; utxoHash: string; utxoIndex: number, metadata?: string }[] = [];

      for (const utxo of utxos) {
        for (const asset of utxo.output.amount) {
          // Skip lovelace
          if (asset.unit === 'lovelace') continue;

          // Extract policyId and assetName from unit
          const policyId = asset.unit.slice(0, 56);
          const assetName = asset.unit.slice(56);

          tokens.push({
            unit: asset.unit,
            quantity: asset.quantity,
            policyId,
            assetName,
            assetNameDecoded: this.hexToString(assetName),
            utxoHash: utxo.input.txHash,
            utxoIndex: utxo.input.outputIndex,

          });
        }
      }

      return createSuccessResult(tokens, FluidMeshSuccessCode.MINTING_SUCCESS);
    } catch (error) {
      console.error("Error fetching CIP113 tokens:", error);
      const fluidError = FluidMeshError.fromError(error);
      return createErrorResult(fluidError);
    }
  }

  /**
   * Get all CIP113 tokens for a wallet across all known policies
   * @param walletAddress - The wallet address
   * @param policies - Array of policies to check
   * @returns Map of policy ID to tokens
   */
  async getAllCIP113TokensForWallet(
    walletAddress: string,
    policies: { policyId: string; scriptCbor: string; tokenName: string }[]
  ): Promise<FluidMeshResult<Map<string, { tokens: { unit: string; quantity: string; assetName: string; assetNameDecoded: string; utxoHash: string; utxoIndex: number }[]; tokenName: string }>>> {
    try {
      const signerHash = deserializeAddress(walletAddress).pubKeyHash;
      const resultMap = new Map<string, { tokens: { unit: string; quantity: string; assetName: string; assetNameDecoded: string; utxoHash: string; utxoIndex: number }[]; tokenName: string }>();

      for (const policy of policies) {
        // Calculate smart receiver address for this policy
        const smartReceiverAddress = this.getSmartReceiverAddress(
          policy.scriptCbor,
          signerHash,
          false
        );

        // Fetch tokens for this address
        const result = await this.getCIP113TokensForAddress(smartReceiverAddress);

        if (result.success && result.data && result.data.length > 0) {
          resultMap.set(policy.policyId, {
            tokens: result.data.map(t => ({
              unit: t.unit,
              quantity: t.quantity,
              assetName: t.assetName,
              assetNameDecoded: t.assetNameDecoded,
              utxoHash: t.utxoHash,
              utxoIndex: t.utxoIndex,
            })),
            tokenName: policy.tokenName,
          });
        }
      }

      return createSuccessResult(resultMap, FluidMeshSuccessCode.MINTING_SUCCESS);
    } catch (error) {
      console.error("Error fetching all CIP113 tokens:", error);
      const fluidError = FluidMeshError.fromError(error);
      return createErrorResult(fluidError);
    }
  }

  /**
   * Select UTxOs for transferring CIP113 tokens
   * @param tokens - Array of token UTxOs with same asset
   * @param amount - Amount to transfer
   * @returns Selected UTxOs and total balance, or null if insufficient funds
   */
  selectUtxoForTransfer(
    tokens: { quantity: string; utxoHash: string; utxoIndex: number }[],
    amount: string
  ): { utxos: string[]; balance: string } | null {
    const amountBigInt = BigInt(amount);

    // Sort tokens by quantity (largest first for efficiency)
    const sortedTokens = [...tokens].sort(
      (a, b) => Number(BigInt(b.quantity) - BigInt(a.quantity))
    );

    // First try to find a single UTxO that has enough balance
    for (const token of sortedTokens) {
      const balance = BigInt(token.quantity);
      if (balance >= amountBigInt) {
        return {
          utxos: [`${token.utxoHash}#${token.utxoIndex}`],
          balance: token.quantity,
        };
      }
    }

    // If no single UTxO has enough, combine multiple UTxOs
    const selectedUtxos: string[] = [];
    let totalBalance = BigInt(0);

    for (const token of sortedTokens) {
      selectedUtxos.push(`${token.utxoHash}#${token.utxoIndex}`);
      totalBalance += BigInt(token.quantity);

      if (totalBalance >= amountBigInt) {
        return {
          utxos: selectedUtxos,
          balance: totalBalance.toString(),
        };
      }
    }

    // Insufficient funds
    return null;
  }

  /**
   * Burn CIP113 tokens
   * @param wallet - Browser wallet for signing
   * @param policyData - Policy data
   * @param amount - Amount to burn
   * @param utxosToSpend - UTxOs containing the tokens (array of txHash#index format)
   * @param currentBalance - Current total balance in the UTxOs
   */
  async burnCIP113Tokens(
    wallet: BrowserWallet,
    policyData: Cip113PolicyData,
    amount: string,
    utxosToSpend: string[],
    currentBalance: string
  ): Promise<FluidMeshResult<{ txHash: string }>> {
    try {
      const walletAddress = await wallet.getChangeAddress();
      const utxos = await wallet.getUtxos();
      const signerHash = deserializeAddress(walletAddress).pubKeyHash;
      const collateral = await getCollateral(wallet, walletAddress);

      // Calculate change if needed
      const changeAmount = BigInt(currentBalance) - BigInt(amount);
      const senderSmartAddress = this.getSmartReceiverAddress(
        policyData.smartToken.scriptCbor,
        signerHash,
        false
      );

      const txBuilder = this.getTxBuilder();

      // Add all input UTxOs
      for (const utxoToSpend of utxosToSpend) {
        const [txHash, indexStr] = utxoToSpend.split("#");
        const index = parseInt(indexStr, 10);

        txBuilder
          .spendingPlutusScript("V3")
          .txIn(txHash, index)
          .txInInlineDatumPresent()
          .txInScript(policyData.smartToken.scriptCbor)
          .txInRedeemerValue(mConStr0([]));
      }

      // Add change output if there's remaining balance
      if (changeAmount > 0) {
        txBuilder.txOut(senderSmartAddress, [
          {
            unit: policyData.smartToken.policy + policyData.tokenNameHex,
            quantity: changeAmount.toString(),
          },
        ]);
      }

      // Burn tokens (negative mint)
      txBuilder
        .mintPlutusScriptV3()
        .mint(
          `-${amount}`,
          policyData.smartToken.policy,
          policyData.tokenNameHex
        )
        .mintingScript(policyData.smartToken.scriptCbor)
        .mintRedeemerValue(mConStr0(["burn"]))
        .requiredSignerHash(signerHash)
        .withdrawalPlutusScriptV3()
        .withdrawal(policyData.smartToken.rewardAddress, "0")
        .withdrawalScript(policyData.smartToken.scriptCbor)
        .withdrawalRedeemerValue(mConStr0([]))
        .withdrawalPlutusScriptV3()
        .withdrawal(policyData.ruleScript.rewardAddress, "0")
        .withdrawalScript(policyData.ruleScript.scriptCbor)
        .withdrawalRedeemerValue(mConStr0([]))
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .txInCollateral(collateral.txHash, collateral.outputIndex)
        .setNetwork(maestroNetwork as 'preview' | 'mainnet');

      await txBuilder.complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx, true);
      const txHashNew = await wallet.submitTx(signedTx);

      return createSuccessResult({ txHash: txHashNew }, FluidMeshSuccessCode.MINTING_SUCCESS);
    } catch (error) {
      console.error("Error burning CIP113 tokens:", error);
      const fluidError = FluidMeshError.fromError(error);
      return createErrorResult(fluidError);
    }
  }

  /**
   * Transfer CIP113 tokens to another address
   * @param wallet - Browser wallet for signing
   * @param policyData - Policy data
   * @param recipientAddress - Recipient's Cardano address
   * @param amount - Amount to transfer
   * @param utxosToSpend - UTxOs containing the tokens (array of txHash#index format)
   * @param currentBalance - Current total balance in the UTxOs
   * @param collateralUtxo - Collateral UTxO (txHash#index format)
   */
  async transferCIP113Tokens(
    wallet: BrowserWallet,
    policyData: Cip113PolicyData,
    recipientAddress: string,
    amount: string,
    utxosToSpend: string[],
    currentBalance: string
  ): Promise<FluidMeshResult<{ txHash: string }>> {
    try {
      const walletAddress = await wallet.getChangeAddress();
      const utxos = await wallet.getUtxos();
      const signerHash = deserializeAddress(walletAddress).pubKeyHash;
      const collateral = getCollateral(wallet, walletAddress)

      // Calculate recipient smart address
      const recipientHash = deserializeAddress(recipientAddress).pubKeyHash;
      const recipientSmartAddress = this.getSmartReceiverAddress(
        policyData.smartToken.scriptCbor,
        recipientHash,
        false
      );

      // Calculate change if needed
      const changeAmount = BigInt(currentBalance) - BigInt(amount);
      const senderSmartAddress = this.getSmartReceiverAddress(
        policyData.smartToken.scriptCbor,
        signerHash,
        false
      );

      const txBuilder = this.getTxBuilder();

      // Add all input UTxOs
      for (const utxoToSpend of utxosToSpend) {
        const [txHash, indexStr] = utxoToSpend.split("#");
        const index = parseInt(indexStr, 10);

        txBuilder
          .spendingPlutusScript("V3")
          .txIn(txHash, index)
          .txInInlineDatumPresent()
          .txInScript(policyData.smartToken.scriptCbor)
          .txInRedeemerValue(mConStr0([]));
      }

      // Add output to recipient
      txBuilder.txOut(recipientSmartAddress, [
        {
          unit: policyData.smartToken.policy + policyData.tokenNameHex,
          quantity: amount,
        },
      ]);

      // Add change output if there's remaining balance
      if (changeAmount > 0) {
        txBuilder.txOut(senderSmartAddress, [
          {
            unit: policyData.smartToken.policy + policyData.tokenNameHex,
            quantity: changeAmount.toString(),
          },
        ]);
      }

      txBuilder
        .changeAddress(walletAddress)
        .selectUtxosFrom(utxos)
        .txInCollateral((await collateral).txHash, (await collateral).outputIndex)
        .requiredSignerHash(signerHash)
        .withdrawalPlutusScriptV3()
        .withdrawal(policyData.smartToken.rewardAddress, "0")
        .withdrawalScript(policyData.smartToken.scriptCbor)
        .withdrawalRedeemerValue(mConStr0([]))
        .withdrawalPlutusScriptV3()
        .withdrawal(policyData.ruleScript.rewardAddress, "0")
        .withdrawalScript(policyData.ruleScript.scriptCbor)
        .withdrawalRedeemerValue(mConStr1([[signerHash], [0], [0]]))
        .setNetwork(maestroNetwork as 'preview' | 'mainnet')




      await txBuilder.complete();

      const unsignedTx = txBuilder.txHex;
      const signedTx = await wallet.signTx(unsignedTx, true);
      const txHashNew = await wallet.submitTx(signedTx);

      return createSuccessResult({ txHash: txHashNew }, FluidMeshSuccessCode.MINTING_SUCCESS);
    } catch (error) {
      console.error("Error transferring CIP113 tokens:", error);
      const fluidError = FluidMeshError.fromError(error);
      return createErrorResult(fluidError);
    }
  }

}

export default FluidMesh;

/**
 * Factory function to create a new FluidMesh instance
 */
export const getFluidMesh = () => {
  return new FluidMesh();
};
