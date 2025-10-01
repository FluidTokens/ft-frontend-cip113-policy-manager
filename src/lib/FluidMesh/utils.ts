import { deserializeAddress, serializePlutusScript, applyParamsToScript, resolveScriptHash, BrowserWallet } from "@meshsdk/core";
import { maestroNetwork } from '@/config/mesh';
import blueprint from '@/config/plutus.json';
import type { Cip113ScriptParams, Cip113Rules } from './types';

/**
 * Get CIP113 mint validator script
 */
export function getCip113Script() {
  const mintValidator = blueprint.validators.find(
    (v) => v.title === 'cip113.smart_token.mint'
  );

  if (!mintValidator) {
    throw new Error('CIP113 mint validator not found in blueprint');
  }

  return {
    scriptCbor: mintValidator.compiledCode,
    scriptHash: mintValidator.hash,
  };
}

/**
 * Get CIP113 withdraw validator script
 */
export function getCip113WithdrawScript() {
  const withdrawValidator = blueprint.validators.find(
    (v) => v.title === 'cip113.smart_token.withdraw'
  );

  if (!withdrawValidator) {
    throw new Error('CIP113 withdraw validator not found in blueprint');
  }

  return {
    scriptCbor: withdrawValidator.compiledCode,
    scriptHash: withdrawValidator.hash,
  };
}

/**
 * Get rules validator script
 */
export function getRulesScript() {
  const rulesValidator = blueprint.validators.find(
    (v) => v.title === 'rule.rules.withdraw'
  );

  if (!rulesValidator) {
    throw new Error('Rules validator not found in blueprint');
  }

  return {
    scriptCbor: rulesValidator.compiledCode,
    scriptHash: rulesValidator.hash,
  };
}

/**
 * Encode CIP113 rules to CBOR
 */
export function encodeRules(rules: Cip113Rules): string {
  // TODO: Implement proper CBOR encoding for rules
  // This is a placeholder - you'll need to implement the actual CBOR encoding
  // based on the Plutus data structure expected by the validator
  const encodedRules = {
    blacklistLinkedList: rules.blacklistLinkedList,
    whitelistLinkedList: rules.whitelistLinkedList,
    admins: rules.admins,
  };

  return JSON.stringify(encodedRules);
}

/**
 * Apply parameters to CIP113 script
 */
export function applyParamsToCip113Script(params: Cip113ScriptParams) {
  const { scriptCbor } = getCip113Script();

  // Apply tokenName and rules parameters to the script
  const parameterizedScript = applyParamsToScript(
    scriptCbor,
    [params.tokenName, params.rules]
  );

  return {
    scriptCbor: parameterizedScript,
    scriptHash: resolveScriptHash(parameterizedScript, 'V3'),
  };
}

/**
 * Generate policy ID from script
 */
export function generatePolicyId(scriptCbor: string): string {
  return resolveScriptHash(scriptCbor, 'V3');
}

/**
 * Get CIP113 smart contract address for a given user address
 */
export function getCip113Address(address: string) {
  try {
    const { pubKeyHash } = deserializeAddress(address);

    const { scriptCbor } = getCip113Script();

    const smartAddress = serializePlutusScript(
      { code: scriptCbor, version: 'V3' },
      pubKeyHash,
      maestroNetwork == 'Preview' ? 0 : 1
    ).address;

    return {
      address: smartAddress,
    };
  } catch (error) {
    console.error('Error in getCip113Address:', error);
    throw error;
  }
}

export const getCollateral = async (
  wallet: BrowserWallet,
  userAddress: string
) => {
  const utxos = await wallet.getUtxos();
  const collateralUtxos = await wallet.getCollateral();

  let collateral;
  if (!collateralUtxos[0]) {
    // Get random utxos with unit "" > 5e6
    const utxo = utxos.find((u) => {
      const isMyOutput = u.output.address == userAddress;
      if (!isMyOutput) return false;
      const utxo = u.output.amount.find((a) => {
        return a.unit === 'lovelace' && Number(a.quantity) >= 10000000;
      });
      return utxo;
    });

    if (utxo) {
      collateral = {
        txHash: utxo.input.txHash,
        outputIndex: utxo.input.outputIndex,
      };
    } else {
      throw new Error('Missing collateral');
    }
  } else {
    collateral = {
      txHash: collateralUtxos[0].input.txHash,
      outputIndex: collateralUtxos[0].input.outputIndex,
    };
  }
  return collateral;
};