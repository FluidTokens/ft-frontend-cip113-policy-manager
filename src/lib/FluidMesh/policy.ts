import { v4 as uuidv4 } from 'uuid';
import type { Policy } from '@/types/general';
import type { Cip113PolicyConfig, Cip113Rules, PolicyCreationResult } from './types';
import {
  encodeRules,
  applyParamsToCip113Script,
  generatePolicyId
} from './utils';

/**
 * Convert Policy config to CIP113 Rules format
 */
export function convertPolicyConfigToRules(config: Cip113PolicyConfig): Cip113Rules {
  return {
    blacklistLinkedList: config.blackList ? '' : '', // Empty linked list initially
    whitelistLinkedList: config.whiteList ? '' : '', // Empty linked list initially
    admins: config.adminAddresses,
  };
}

/**
 * Prepare policy script parameters from configuration
 */
export function preparePolicyParams(config: Cip113PolicyConfig) {
  const rules = convertPolicyConfigToRules(config);
  const encodedRules = encodeRules(rules);

  return {
    tokenName: config.tokenName,
    rules: encodedRules,
  };
}

/**
 * Create a new CIP113 policy (without minting on-chain)
 * This prepares the policy data and generates the policy ID
 */
export function createPolicyData(config: Cip113PolicyConfig): PolicyCreationResult {
  try {
    // Prepare script parameters
    const params = preparePolicyParams(config);

    // Apply parameters to script
    const { scriptCbor } = applyParamsToCip113Script(params);

    // Generate policy ID
    const policyId = generatePolicyId(scriptCbor);

    return {
      policyId,
      tokenName: config.tokenName,
      scriptCbor,
    };
  } catch (error) {
    console.error('Error creating policy data:', error);
    throw error;
  }
}



/**
 * Validate policy configuration
 */
export function validatePolicyConfig(config: Cip113PolicyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.tokenName || config.tokenName.trim().length === 0) {
    errors.push('Token name is required');
  }

  if (config.tokenName.length > 32) {
    errors.push('Token name must be 32 characters or less');
  }

  if (!config.adminAddresses || config.adminAddresses.length === 0) {
    errors.push('At least one admin address is required');
  }

  if (config.adminAddresses) {
    config.adminAddresses.forEach((address, index) => {
      if (!address || address.trim().length === 0) {
        errors.push(`Admin address at index ${index} is empty`);
      }
      // Basic Cardano address validation (starts with addr or addr_test)
      if (!address.startsWith('addr') && !address.startsWith('addr_test')) {
        errors.push(`Admin address at index ${index} is not a valid Cardano address`);
      }
    });
  }

  if (!config.blackList && !config.whiteList) {
    errors.push('At least one rule (blacklist or whitelist) must be enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
