import fs from "node:fs";
import {
  BlockfrostProvider,
  MeshTxBuilder,
  MeshWallet,
  serializePlutusScript,
  UTxO,
  MaestroProvider,
  resolveScriptHash,
  serializeRewardAddress,PlutusScript

} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import blueprint from "../plutus.json"; // Your Plutus contract blueprint
import blueprintgy from "./plutus.json"; // Your Plutus contract blueprint

// Setup Blockfrost provider
const blockchainProvider = new BlockfrostProvider("previewR5n6b2nOs73gJELTuQb4fZZskH1cdEjA");


//Setup Maestro

const maestroTestnet = new MaestroProvider({
    network: 'Preview',
    apiKey: 'HGKu5DjuRaOC5EOLOQ6Rl7Ngybqx8opu',
    turboSubmit: false,
});

// wallet for signing transactions
export const wallet = new MeshWallet({
  networkId: 0,
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("address.sk").toString(),
  },
});

// Function to get the Plutus script and address
export function getScript() {
  const scriptCbor = applyParamsToScript(
    blueprint.validators[0].compiledCode,
    []
  );

  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" }
  ).address;

  const policy= resolveScriptHash(scriptCbor, "V3");
  return { scriptCbor, scriptAddr,policy };
}



// Function to get the Plutus script and address
export function getRuleScript(blacklist,whitelist ,admins) {
  const scriptCbor = applyParamsToScript(
    blueprintgy.validators[4].compiledCode,
    [blacklist,whitelist,admins]
  );


  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" },undefined,0
  ).address;

  const policy= resolveScriptHash(scriptCbor, "V3");
  let rewardAddress=serializeRewardAddress( 
    policy,  
    true, //here is true for contracts 
    0, //testnet or mainnet 
  );
  
  console.log(policy)

  return { scriptCbor, scriptAddr, policy,rewardAddress };
}



export function getCIP113Policy(tokenName,rule) {
  const scriptCbor = applyParamsToScript(
    blueprintgy.validators[0].compiledCode,
    [tokenName,rule]
  );


  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" },undefined,0
  ).address;

  const policy= resolveScriptHash(scriptCbor, "V3");
  let rewardAddress=serializeRewardAddress( 
    policy,  
    true, //here is true for contracts 
    0, //testnet or mainnet 
  );
  
  console.log(policy)

  return { scriptCbor, scriptAddr, policy,rewardAddress };
}


export function getSmartReceiver(cbor:any,hash:any,smartContract:boolean){

  const scriptreal:PlutusScript = { 
    code: cbor, 
    version: "V3", 
  }; 

 const { address: scriptAddress } = serializePlutusScript(scriptreal,hash,0,smartContract);
  return scriptAddress
}

// Reusable function to get a transaction builder
export function getTxBuilder() {
  return new MeshTxBuilder({
    fetcher: blockchainProvider,
    evaluator:blockchainProvider,
    submitter: blockchainProvider,
    verbose:true
  });
}



// Reusable function to get a UTxO by transaction hash
export async function getUtxoByTxHash(txHash: string): Promise<UTxO> {
  const utxos = await maestroTestnet.fetchUTxOs(txHash);
  if (utxos.length === 0) {
    throw new Error("UTxO not found");
  }
  return utxos[0];
}

