/**
 * FluidMesh Error Types and Messages
 */

export enum FluidMeshErrorCode {
  // Deployment errors
  CREDENTIALS_ALREADY_REGISTERED = 'CREDENTIALS_ALREADY_REGISTERED',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',

  // Transaction errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',

  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_SIGNATURE_FAILED = 'WALLET_SIGNATURE_FAILED',

  // Minting errors
  MINTING_FAILED = 'MINTING_FAILED',
  COLLATERAL_REQUIRED = 'COLLATERAL_REQUIRED',

  // Validation errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TOKEN_NAME = 'INVALID_TOKEN_NAME',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',

  // Allocation errors
  INVALID_ALLOCATION = 'INVALID_ALLOCATION',
  ALLOCATIONS_EXCEED_TOTAL = 'ALLOCATIONS_EXCEED_TOTAL',
  DUPLICATE_RECIPIENT = 'DUPLICATE_RECIPIENT',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum FluidMeshSuccessCode {
  CREDENTIALS_ALREADY_REGISTERED = 'CREDENTIALS_ALREADY_REGISTERED',
  DEPLOYMENT_SUCCESS = 'DEPLOYMENT_SUCCESS',
  MINTING_SUCCESS = 'MINTING_SUCCESS',
}

export const ERROR_MESSAGES: Record<FluidMeshErrorCode, string> = {
  [FluidMeshErrorCode.CREDENTIALS_ALREADY_REGISTERED]:
    'Stake certificates are already registered on the blockchain',
  [FluidMeshErrorCode.DEPLOYMENT_FAILED]:
    'Policy deployment failed. Please try again later',
  [FluidMeshErrorCode.INSUFFICIENT_FUNDS]:
    'Insufficient funds in the wallet. Make sure you have enough ADA',
  [FluidMeshErrorCode.TRANSACTION_FAILED]:
    'Transaction failed. Check the parameters and try again',
  [FluidMeshErrorCode.TRANSACTION_REJECTED]:
    'Transaction rejected. You canceled the signature in the wallet',
  [FluidMeshErrorCode.WALLET_NOT_CONNECTED]:
    'Wallet not connected. Please connect your wallet before continuing',
  [FluidMeshErrorCode.WALLET_SIGNATURE_FAILED]:
    'Wallet signature failed. Please try signing the transaction again',
  [FluidMeshErrorCode.MINTING_FAILED]:
    'Token minting failed. Verify that the certificates are registered',
  [FluidMeshErrorCode.COLLATERAL_REQUIRED]:
    'Collateral is required for the transaction. Add a collateral UTxO',
  [FluidMeshErrorCode.INVALID_ADDRESS]:
    'Invalid address. Please make sure the addresses are correct',
  [FluidMeshErrorCode.INVALID_TOKEN_NAME]:
    'Invalid token name. Use only alphanumeric characters',
  [FluidMeshErrorCode.INVALID_CONFIGURATION]:
    'Invalid configuration. Check the input parameters',
  [FluidMeshErrorCode.INVALID_ALLOCATION]:
    'Invalid allocation. Check recipient addresses and quantities',
  [FluidMeshErrorCode.ALLOCATIONS_EXCEED_TOTAL]:
    'Total allocations exceed minting quantity',
  [FluidMeshErrorCode.DUPLICATE_RECIPIENT]:
    'Duplicate recipient addresses found',
  [FluidMeshErrorCode.NETWORK_ERROR]:
    'Network error. Please check your internet connection',
  [FluidMeshErrorCode.PROVIDER_ERROR]:
    'Blockchain provider error. The service may be temporarily unavailable',
  [FluidMeshErrorCode.UNKNOWN_ERROR]:
    'Unknown error. Please try again later or contact support',
};

export const SUCCESS_MESSAGES: Record<FluidMeshSuccessCode, string> = {
  [FluidMeshSuccessCode.CREDENTIALS_ALREADY_REGISTERED]:
    'Certificates were already registered. You can proceed with minting',
  [FluidMeshSuccessCode.DEPLOYMENT_SUCCESS]:
    'Policy successfully deployed!',
  [FluidMeshSuccessCode.MINTING_SUCCESS]:
    'Tokens successfully minted!',
};

export class FluidMeshError extends Error {
  code: FluidMeshErrorCode;
  userMessage: string;
  originalError?: unknown;

  constructor(
    code: FluidMeshErrorCode,
    userMessage?: string,
    originalError?: unknown
  ) {
    super(userMessage || ERROR_MESSAGES[code]);
    this.name = 'FluidMeshError';
    this.code = code;
    this.userMessage = userMessage || ERROR_MESSAGES[code];
    this.originalError = originalError;
  }

  static fromError(error: unknown): FluidMeshError {
    // If it's already a FluidMeshError, return it
    if (error instanceof FluidMeshError) {
      return error;
    }

    // Parse error message to determine error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Check for specific error patterns
    if (lowerMessage.includes('already known credentials') ||
      lowerMessage.includes('re-register')) {
      return new FluidMeshError(
        FluidMeshErrorCode.CREDENTIALS_ALREADY_REGISTERED,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('insufficient') ||
      lowerMessage.includes('not enough ada')) {
      return new FluidMeshError(
        FluidMeshErrorCode.INSUFFICIENT_FUNDS,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('user declined') ||
      lowerMessage.includes('rejected') ||
      lowerMessage.includes('cancelled')) {
      return new FluidMeshError(
        FluidMeshErrorCode.TRANSACTION_REJECTED,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('signature') ||
      lowerMessage.includes('signing')) {
      return new FluidMeshError(
        FluidMeshErrorCode.WALLET_SIGNATURE_FAILED,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('timeout')) {
      return new FluidMeshError(
        FluidMeshErrorCode.NETWORK_ERROR,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('collateral')) {
      return new FluidMeshError(
        FluidMeshErrorCode.COLLATERAL_REQUIRED,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('invalid address')) {
      return new FluidMeshError(
        FluidMeshErrorCode.INVALID_ADDRESS,
        undefined,
        error
      );
    }

    if (lowerMessage.includes('allocation') || lowerMessage.includes('recipient')) {
      return new FluidMeshError(
        FluidMeshErrorCode.INVALID_ALLOCATION,
        undefined,
        error
      );
    }

    // Default to unknown error
    return new FluidMeshError(
      FluidMeshErrorCode.UNKNOWN_ERROR,
      errorMessage,
      error
    );
  }
}

export interface FluidMeshResult<T> {
  success: boolean;
  data?: T;
  error?: FluidMeshError;
  successCode?: FluidMeshSuccessCode;
}

/**
 * Helper to create a success result
 */
export function createSuccessResult<T>(
  data: T,
  successCode?: FluidMeshSuccessCode
): FluidMeshResult<T> {
  return {
    success: true,
    data,
    successCode,
  };
}

/**
 * Helper to create an error result
 */
export function createErrorResult<T>(
  error: FluidMeshError
): FluidMeshResult<T> {
  return {
    success: false,
    error,
  };
}
