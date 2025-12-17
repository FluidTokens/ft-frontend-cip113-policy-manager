# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CIP113 Policy Manager is a Next.js 15 frontend application for creating and managing CIP-113 compliant smart tokens on the Cardano blockchain. The application allows users to create token policies with configurable blacklist/whitelist rules, mint tokens, and transfer them between addresses.

**Tech Stack**: Next.js 15 (React 19, TurboPack), TypeScript, Tailwind CSS 4, Radix UI, Mesh SDK, Zustand, SST (AWS deployment)

## Essential Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start development server (http://localhost:3000)
npm run build           # Build production bundle
npm run lint            # Run ESLint
npm start               # Start production server
```

### Deployment (SST)
```bash
sst deploy --stage dev   # Deploy to dev environment
sst deploy --stage qa    # Deploy to QA environment
sst deploy --stage prod  # Deploy to production
```

**Deployment URLs**:
- Dev: cip113-policy-manager-dev.fluidtokens.com
- QA: cip113-policy-manager-qa.fluidtokens.com
- Prod: cip113-policy-manager.fluidtokens.com

## Environment Configuration

Environment files are required for each stage and must be placed in the project root:
- `.env.development` - for dev
- `.env.qa` - for QA
- `.env.production` - for prod

**Required variables**:
```env
NEXT_PUBLIC_MAESTRO_API_KEY=your_maestro_key
NEXT_PUBLIC_MAESTRO_NETWORK=Preview  # or Mainnet
AWS_CERT=your_aws_cert_arn           # for SST deployment
```

**IMPORTANT**: The `sst.config.ts` dynamically loads environment files based on the stage and passes variables to the Next.js build. Environment variables are accessed via `process.env` in config files (see [mesh.ts](src/config/mesh.ts)).

## Architecture

### FluidMesh SDK ([lib/FluidMesh/](src/lib/FluidMesh/))

The core blockchain interaction layer built on top of Mesh SDK. This is the most critical part of the codebase for understanding how CIP-113 tokens work.

**Key concepts**:
1. **Two-Script System**: CIP-113 tokens require two Plutus scripts:
   - **Rule Script** (withdraw validator): Enforces blacklist/whitelist rules
   - **Smart Token Script** (mint validator): Handles minting/burning, parameterized with token name and rule script policy hash

2. **Smart Receiver Addresses**: Tokens are locked at script addresses derived from both the token's policy script and the recipient's public key hash. This creates a unique address per (policy, recipient) pair.

3. **Stake Certificate Registration**: Before minting, both rule and smart token scripts must have their stake credentials registered on-chain via `deployPolicy()`. The code checks if credentials are already registered to avoid redundant transactions.

4. **UTxO Selection**: When transferring or burning tokens, the SDK selects UTxOs using `selectUtxoForTransfer()`, which tries to find a single UTxO with sufficient balance first, then combines multiple UTxOs if needed.

**Main FluidMesh methods**:
- `createPolicyData()` - Prepares all scripts and addresses from policy configuration
- `deployPolicy()` - Registers stake certificates (prerequisite for minting)
- `mintPolicy()` - Mints tokens with CIP-777 metadata (Fragma RWA schema)
- `transferCIP113Tokens()` - Transfers tokens to another address
- `burnCIP113Tokens()` - Burns tokens (negative mint)
- `getCIP113TokensForAddress()` - Fetches tokens at a smart receiver address
- `getAllCIP113TokensForWallet()` - Fetches all tokens across policies for a wallet

**Transaction Pattern**: All smart contract transactions require:
- Collateral UTxO (≥10 ADA)
- Required signer hash (wallet's public key hash)
- Withdrawal of 0 lovelace from both rule and smart token stake addresses
- Proper redeemers for spending/minting scripts

### State Management (Zustand)

Two global stores persist to localStorage:

1. **`walletStore`** ([store/walletStore.ts](src/store/walletStore.ts)):
   - Auto-reconnects wallet on page reload
   - Validates wallet network matches configured Maestro network
   - Stores: wallet instance, address, network, wallet name

2. **`policyStore`** ([store/policyStore.ts](src/store/policyStore.ts)):
   - Stores created policies with all script data
   - Required for token operations (scripts, addresses, policy IDs)
   - Policies include: token name, admin addresses, rule/token scripts (CBOR), reward addresses

### Plutus Blueprint ([config/plutus.json](src/config/plutus.json))

Contains compiled Plutus V3 validators:
- `cip113.smart_token.mint` - Parameterized with token name hex and rule policy hash
- `rule.rules.withdraw` - Parameterized with blacklist, whitelist (empty strings if disabled), and admin public key hashes

Parameters are applied using `applyParamsToScript()` from `@meshsdk/core-csl`, which generates unique script CBOR and policy hashes for each configuration.

### Metadata Schema (CIP-777 Fragma RWA)

Minting includes comprehensive metadata at label 777:
- `asset_ref_id` - UUID for the RWA series
- `attestation_sha256` - SHA-256 of the asset-token mapping document
- `tokenomics` - Total supply, decimals, minting policy hash, admin PKHs, initial allocations
- `mapping` - Optional IPFS CID and URL for mapping document
- `rule_script_policy_hash` - The rule script's policy hash

See [types/general.ts](src/types/general.ts) for full type definitions.

### Error Handling

FluidMesh uses a Result pattern ([lib/FluidMesh/errors.ts](src/lib/FluidMesh/errors.ts)):
- `FluidMeshResult<T>` - Contains `success`, `data`, `error`, and optional `successCode`
- `FluidMeshError.fromError()` - Parses blockchain/wallet errors into user-friendly messages
- Error codes include: `CREDENTIALS_ALREADY_REGISTERED`, `INSUFFICIENT_FUNDS`, `TRANSACTION_REJECTED`, etc.
- Success codes: `DEPLOYMENT_SUCCESS`, `MINTING_SUCCESS`, `CREDENTIALS_ALREADY_REGISTERED`

**Pattern**: Always check `result.success` before accessing `result.data`, and handle `result.error` appropriately.

### Routing Structure

- `/` - Landing page
- `/dashboard` - View all created policies and owned tokens
- `/policy` - Create new CIP-113 policy
- `/mint` - Mint tokens under existing policy
- `(action)` route group - Wraps `/policy` and `/mint` with shared layout

### Component Organization

- `components/ui/` - Radix UI primitives (button, dialog, input, etc.)
- `components/form/` - CreatePolicyForm, MintForm
- `components/modals/` - TransferTokenModal, BurnTokenModal, PolicyPicker
- `components/dashboard/` - TokensOverview and dashboard-specific components

### Wallet Integration

Supports Cardano wallets via Mesh SDK's BrowserWallet API:
- Eternl, Nami, Flint, and other CIP-30 compatible wallets
- Network validation on connect (Preview = 0, Mainnet = 1)
- Auto-reconnection via Zustand persistence

## Key Development Patterns

### Creating a Policy
1. User fills CreatePolicyForm with token name, admin addresses, blacklist/whitelist toggles
2. `FluidMesh.createPolicyData()` generates rule script and smart token script with applied parameters
3. Policy data stored in `policyStore`
4. User must deploy (`deployPolicy()`) before minting - this registers stake certificates

### Minting Tokens
1. User selects policy from `policyStore`
2. Fills MintForm with quantity and metadata
3. `FluidMesh.mintPolicy()` builds transaction:
   - Mints tokens to user's smart receiver address
   - Includes CIP-777 metadata
   - Withdraws 0 from both rule and smart token stake addresses
   - Requires collateral UTxO
4. Wallet signs and submits transaction

### Transferring Tokens
1. Fetch tokens via `getCIP113TokensForAddress()` using sender's smart receiver address
2. Select UTxOs via `selectUtxoForTransfer()` based on amount
3. Calculate recipient's smart receiver address from their wallet address and token policy
4. `transferCIP113Tokens()` spends sender's UTxOs, sends tokens to recipient's smart address
5. If change needed, creates output back to sender's smart address
6. Withdrawals from both stake addresses with proper redeemers (rule script uses `mConStr1` with signer, blacklist, whitelist indices)

### Dashboard Token Display
1. Iterate through policies in `policyStore`
2. For each policy, calculate user's smart receiver address
3. Fetch tokens at that address
4. Display aggregated view across all policies

## Configuration Notes

- **React Strict Mode**: Disabled (`reactStrictMode: false`) to avoid double-rendering issues with wallet connections
- **Webpack**: Configured for async WebAssembly (Mesh SDK requirement) and SVG imports
- **Images**: Unoptimized for static export compatibility with SST
- **Path Alias**: `@/*` maps to `src/*`
- **ESLint**: Errors ignored during builds (set `ignoreDuringBuilds: true`)

## Important Caveats

1. **Collateral Requirement**: All script transactions need ≥10 ADA collateral. The `getCollateral()` utility finds suitable UTxOs.

2. **Network Consistency**: Wallet network ID must match `MAESTRO_NETWORK` config. Mismatch shows error toast.

3. **Stake Certificate Registration**: Must be done before minting. The code handles already-registered credentials gracefully.

4. **Smart Receiver Addresses**: Each user has a unique address per policy. Regular wallet addresses cannot directly hold CIP-113 tokens.

5. **Parameter Application**: Changing token name, rule settings, or admin addresses generates a completely new policy (different script hash).

6. **Metadata Standard**: Uses CIP-777 (Fragma RWA v1), not CIP-25. Includes attestation hash and tokenomics.
