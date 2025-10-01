import { MaestroSupportedNetworks } from "@meshsdk/core";

export const maestroNetwork = process.env.MAESTRO_NETWORK || 'Mainnet' satisfies MaestroSupportedNetworks
export const maestroKey = process.env.MAESTRO_API_KEY || '' satisfies string