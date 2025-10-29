export type Policy = {
  id: string;
  policyId: string;
  tokenName: string;
  tokenNameHex: string;
  blackList: boolean;
  whiteList: boolean;
  txHash: string;
  adminAddresses: string[];
  scriptCbor: string;
  smartTokenRewardAddress: string;
  ruleScriptPolicy: string;
  ruleScriptCbor: string;
  ruleScriptRewardAddress: string;
  smartReceiverAddress: string;
  createdAt: string;
  deployedBy: string;
}

// --- 1. Definizione per il Blocco 'mapping' (Opzionale) ---
interface FragmaRwaMapping {
  /** IPFS CID dove il Token-ownership-Mapping.pdf è pinnato. */
  cid?: string;
  /** HTTPS mirror dello stesso PDF. */
  url?: string;
  /** Informazioni su una firma detached per Token-ownership-Mapping.pdf. */
  signature?: {
    /** Tipo di firma (es. "pgp", "cms"). */
    type: string;
    /** IPFS CID per il file di firma (es. Token-ownership-Mapping.pdf.asc). */
    cid: string;
  };
}

// --- 2. Definizione per le 'initial_allocations' (Raccomandato) ---
interface InitialAllocation {
  /** Etichetta descrittiva dell'allocazione (es. "Public Sale", "Team"). */
  label: string;
  /** Indirizzo Cardano (o script address) che riceve i token. */
  address: string[];
  /** Quantità di token allocati (come intero). */
  amount: number;
}

// --- 3. Definizione per il Blocco 'tokenomics' (Obbligatorio) ---
interface FragmaRwaTokenomics {
  /** Quantità totale di token creati al momento del mint (intero). */
  total_supply: number;
  /** Precisione per la visualizzazione/UI (come intero, 0 se il token è indivisibile). */
  decimals: number;
  /** Hash di 56 caratteri esadecimali dello Smart Token Script. */
  minting_policy_hash: string;
  /** Array di Payment Key Hashes (pkh) autorizzati per operazioni di mint/burn e WL/BL. */
  admin_pkh: string[];
  /** Chi riceve cosa al mint; la somma deve essere uguale a total_supply. */
  initial_allocations?: InitialAllocation[];
}

// --- 4. Definizione per il Contenuto Principale 'fragma_rwa_v1' ---
interface FragmaRwaV1 {
  /** ID unico on-chain del token: "<policy_id>.<token_name_hex>". */
  policy: string;
  assetName: string,
  /** Identificatore stabile della serie RWA (UUID v4). */
  asset_ref_id: string;
  /** Hash di 56 caratteri esadecimali dello **Rule Script** (CIP-113). */
  rule_script_policy_hash: string;
  /** SHA-256 hash (64 caratteri esadecimali) del Mapping Asset↔Token (attestazione). */
  attestation_sha256: string;
  /** Puntatori opzionali per facilitare il recupero del file di mapping. */
  mapping?: FragmaRwaMapping;
  /** Dettagli sulla tokenomics e l'allocazione iniziale. */
  tokenomics: FragmaRwaTokenomics;
}

// --- 5. Definizione per il Blocco JSON Radice ---
interface FragmaRwaMintMetadata {
  /** CIP-25 Metadata Label (777 è l'etichetta per Fragma RWA). */
  '777': {
    /** Versione dello schema Fragma RWA Mint Metadata. */
    fragma_rwa_v1: FragmaRwaV1;
  };
}

export interface FragmaMintMetadataInput {
  // --- Metadati di base (obbligatori) ---

  /** UUID v4 - Identificatore stabile della serie RWA. */
  asset_ref_id: string;

  /** SHA-256 hash (64-hex) del documento Asset↔Token Mapping finalizzato. */
  attestation_sha256: string;

  /** Array di Payment Key Hashes (pkh) autorizzati per operazioni admin. */
  admin_pkh: string[];

  // --- Opzionali/Raccomandati ---

  /** Chi riceve cosa al mint; la somma deve essere uguale a total_supply (Raccomandato). */
  initial_allocations?: InitialAllocation[];

  /** Puntatori opzionali per facilitare il recupero del file di mapping. */
  mapping?: FragmaRwaMapping;
}

export type {
  FragmaRwaMintMetadata,
  FragmaRwaV1,
  FragmaRwaTokenomics,
  InitialAllocation,
  FragmaRwaMapping,
};
