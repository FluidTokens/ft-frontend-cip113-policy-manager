import { Asset, PlutusScript } from '@meshsdk/core';

/**
 * CIP113 Policy configuration
 */
export interface Cip113PolicyConfig {
  tokenName: string;
  blackList: boolean;
  whiteList: boolean;
  adminAddresses: string[];
}

/**
 * Script data returned from validators
 */
export interface ScriptData {
  scriptCbor: string;
  scriptAddr: string;
  policy: string;
  rewardAddress: string;
}

/**
 * Complete CIP113 policy data
 */
export interface Cip113PolicyData {
  tokenName: string;
  tokenNameHex: string;
  signerHash: string;
  ruleScript: ScriptData;
  smartToken: ScriptData;
  smartReceiverAddress: string;
}

/**
 * Policy creation result
 */
export interface PolicyCreationResult {
  policyId: string;
  tokenName: string;
  scriptCbor: string;
  txHash?: string;
  policyData?: Cip113PolicyData;
}

/**
 * CIP113 Script parameters
 */
export interface Cip113ScriptParams {
  tokenName: string;
  rules: string; // CBOR encoded rules
}

/**
 * CIP113 Rules structure
 */
export interface Cip113Rules {
  blacklistLinkedList: string;
  whitelistLinkedList: string;
  admins: string[];
}

/**
 * Mint transaction parameters
 */
export interface MintTransactionParams {
  walletAddress: string;
  policyScript: PlutusScript;
  asset: Asset;
  metadata?: Record<string, unknown>;
}

/**
 * Transaction build result
 */
export interface TransactionBuildResult {
  unsignedTx: string;
  txHash: string;
}

/**
 * Recipient structure for transfers
 */
export interface Recipient {
  address: string;
  amount: string;
}
