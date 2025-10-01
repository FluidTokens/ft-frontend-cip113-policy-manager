// Core FluidMesh class and provider
export { default as FluidMesh, getFluidMesh } from './FluidMesh';

// Types
export type {
  Cip113PolicyConfig,
  Cip113PolicyData,
  ScriptData,
  PolicyCreationResult,
  Cip113ScriptParams,
  Cip113Rules,
  MintTransactionParams,
  TransactionBuildResult,
} from './types';

// Error handling
export {
  FluidMeshError,
  FluidMeshErrorCode,
  FluidMeshSuccessCode,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  createSuccessResult,
  createErrorResult,
} from './errors';
export type { FluidMeshResult } from './errors';

// Utilities (legacy support - prefer using FluidMesh class methods)
export {
  getCip113Script,
  getCip113WithdrawScript,
  getRulesScript,
  getCip113Address,
  encodeRules,
  applyParamsToCip113Script,
  generatePolicyId,
} from './utils';

// Policy management (legacy support - prefer using FluidMesh class methods)
export {
  createPolicyData,
  validatePolicyConfig,
  preparePolicyParams,
  convertPolicyConfigToRules,
} from './policy';
