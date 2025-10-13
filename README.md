# CIP113 Policy Manager

Frontend application for managing CIP113 smart tokens on Cardano blockchain. Create policies, mint tokens, and transfer them with full support for blacklist/whitelist rules.

## Features

- **Create Policies**: Deploy CIP113-compliant token policies with configurable rules
- **Mint Tokens**: Mint fungible tokens under your policies
- **Transfer Tokens**: Send tokens to other addresses
- **Multi-Wallet Support**: Connect with Cardano wallets (Eternl, Nami, Flint, etc.)
- **Dashboard**: View and manage all your tokens in one place

## Tech Stack

- **Next.js 15** with React 19 and TurboPack
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Radix UI** components
- **Mesh SDK** for Cardano blockchain interactions
- **Zustand** for state management
- **SST** for AWS deployment

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Cardano wallet extension

### Installation

```bash
npm install
```

### Environment Setup

Create environment files for each stage:

- `.env.development` for dev
- `.env.qa` for qa
- `.env.production` for prod

Required variables:

```env
NEXT_PUBLIC_MAESTRO_API_KEY=your_maestro_key
NEXT_PUBLIC_MAESTRO_NETWORK=Preview # or Mainnet
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

## Deployment

Deployed via SST to AWS with CloudFront distribution:

- **Dev**: cip113-policy-manager-dev.fluidtokens.com
- **QA**: cip113-policy-manager-qa.fluidtokens.com
- **Prod**: cip113-policy-manager.fluidtokens.com

```bash
sst deploy --stage dev
```

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # Radix UI components
│   ├── form/        # Form components
│   ├── modals/      # Modal dialogs
│   └── dashboard/   # Dashboard components
├── lib/
│   └── FluidMesh/   # Cardano blockchain SDK wrapper
├── store/           # Zustand stores
├── hooks/           # React hooks
└── config/          # Configuration files
```

## FluidMesh SDK

Core blockchain interaction layer built on Mesh SDK:

- Policy creation and deployment
- Token minting
- Token transfers with smart contract routing
- UTxO management
- Network abstraction (testnet/mainnet)

## License

Private
