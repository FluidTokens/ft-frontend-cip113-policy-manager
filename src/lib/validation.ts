import { deserializeAddress } from '@meshsdk/core';
import { maestroNetwork } from '@/config/mesh';
import {
  ValidationResult,
  RecipientAllocation,
  ClaimEntry,
} from '@/types/general';

/**
 * Validate Cardano address format and network compatibility
 */
export function validateCardanoAddress(address: string): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { valid: false, error: 'Address cannot be empty' };
  }

  try {
    // Try to deserialize the address to check if it's valid
    deserializeAddress(address);

    // Check network compatibility based on address prefix
    if (maestroNetwork === 'Preview' && !address.startsWith('addr_test')) {
      return {
        valid: false,
        error: 'Address must be a testnet address (addr_test...)',
      };
    }

    if (maestroNetwork === 'Mainnet' && !address.startsWith('addr1')) {
      return {
        valid: false,
        error: 'Address must be a mainnet address (addr1...)',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid address format: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

/**
 * Validate quantity is a positive integer
 */
export function validateQuantity(quantity: string): ValidationResult {
  if (!quantity || quantity.trim().length === 0) {
    return { valid: false, error: 'Quantity cannot be empty' };
  }

  const num = parseFloat(quantity);

  if (isNaN(num)) {
    return { valid: false, error: 'Quantity must be a valid number' };
  }

  if (num <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Quantity must be an integer' };
  }

  return { valid: true };
}

/**
 * Validate recipient allocations for multi-recipient minting
 */
export function validateRecipientAllocations(
  allocations: RecipientAllocation[],
  totalQuantity: string
): ValidationResult {
  if (allocations.length === 0) {
    return { valid: true }; // Empty allocations is valid (all goes to minter)
  }

  // Check for duplicate addresses
  const addresses = allocations.map((a) => a.address);
  const uniqueAddresses = new Set(addresses);
  if (addresses.length !== uniqueAddresses.size) {
    return {
      valid: false,
      error: 'Duplicate addresses found in allocations',
    };
  }

  // Validate each allocation
  for (let i = 0; i < allocations.length; i++) {
    const allocation = allocations[i];

    // Validate address
    const addressValidation = validateCardanoAddress(allocation.address);
    if (!addressValidation.valid) {
      return {
        valid: false,
        error: `Row ${i + 1}: ${addressValidation.error}`,
      };
    }

    // Validate quantity
    const quantityValidation = validateQuantity(allocation.quantity);
    if (!quantityValidation.valid) {
      return {
        valid: false,
        error: `Row ${i + 1}: ${quantityValidation.error}`,
      };
    }
  }

  // Validate sum doesn't exceed total
  const sum = allocations.reduce(
    (acc, curr) => acc + BigInt(curr.quantity),
    BigInt(0)
  );

  if (sum > BigInt(totalQuantity)) {
    return {
      valid: false,
      error: `Total allocations (${sum.toString()}) exceed minting quantity (${totalQuantity})`,
    };
  }

  return { valid: true };
}

/**
 * Validate claim list entries
 */
export function validateClaimList(
  claims: ClaimEntry[],
  totalClaimPool: string
): ValidationResult {
  if (claims.length === 0) {
    return { valid: false, error: 'Claim list cannot be empty' };
  }

  // Check for duplicate addresses
  const addresses = claims.map((c) => c.address);
  const uniqueAddresses = new Set(addresses);
  if (addresses.length !== uniqueAddresses.size) {
    return {
      valid: false,
      error: 'Duplicate addresses found in claim list',
    };
  }

  // Validate each claim
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];

    // Validate address
    const addressValidation = validateCardanoAddress(claim.address);
    if (!addressValidation.valid) {
      return {
        valid: false,
        error: `Row ${i + 1}: ${addressValidation.error}`,
      };
    }

    // Validate max claimable
    const quantityValidation = validateQuantity(claim.maxClaimable);
    if (!quantityValidation.valid) {
      return {
        valid: false,
        error: `Row ${i + 1}: ${quantityValidation.error}`,
      };
    }
  }

  // Validate sum must not exceed total claim pool (can be less or equal)
  const sum = claims.reduce(
    (acc, curr) => acc + BigInt(curr.maxClaimable),
    BigInt(0)
  );

  if (sum > BigInt(totalClaimPool)) {
    return {
      valid: false,
      error: `Sum of max claimable (${sum.toString()}) exceeds claim pool (${totalClaimPool})`,
    };
  }

  return { valid: true };
}
