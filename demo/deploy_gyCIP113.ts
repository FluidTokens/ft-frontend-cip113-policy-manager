import { Asset, conStr0, deserializeAddress, mConStr0,mConStr } from "@meshsdk/core";
import { getScript, getTxBuilder, wallet,getRuleScript,getCIP113Policy } from "./common";
import * as mincommon from "./mincommon";

async function main() {
  // These are the assets we want to lock into the contract
  const assets: Asset[] = [
    {
      unit: "lovelace",
      quantity: "1000000", // 1 ADA in lovelace
    },
  ];

  // Get UTxOs and wallet address
  
  const utxos = await wallet.getUtxos();
  console.log(utxos)
  const walletAddress = (await wallet.getUsedAddresses())[0];

  //inputs user
  //adming pubkeylist
  //blacklist_linked_list: ByteArray,
  //whitelist_linked_list: ByteArray,
  //admins: List<ByteArray>,

  //Vuoto se non incluso
  let blacklist=""
  let whitelist=""
  //qua lista di pubkeyHash degli admin, in questo esempio solo Raul

   // Hash of the public key of the wallet, to be used in the datum
  const signerHash = deserializeAddress(walletAddress).pubKeyHash;

  let admins=[signerHash]

  let rule_script=getRuleScript(blacklist,whitelist,admins)

  console.log("Questo il reward address da registrare")
  console.log(rule_script.rewardAddress)


  //La policy ora va creata con l'hash del rule script ossia
  console.log(rule_script.policy)

  let tokenName="raulUSDC"
  let tokenNameHex=Buffer.from(tokenName, "utf8").toString("hex")
  let smartToken=getCIP113Policy(tokenNameHex,rule_script.policy)

  console.log("ora quindi la policy del token cip113 sarà")
  console.log(smartToken.policy)

  console.log("registriamo anche smart token reward address")

  const txBuilder = getTxBuilder();
  await txBuilder
    .registerStakeCertificate(rule_script.rewardAddress)
    .registerStakeCertificate(smartToken.rewardAddress)
    .changeAddress(walletAddress) // Send change back to the wallet address
    .selectUtxosFrom(utxos) // Select UTxOs to use in the transaction
    .complete(); // Complete the transaction building

  const unsignedTx = txBuilder.txHex;
  // Sign the transaction with the wallet
  const signedTx = await wallet.signTx(unsignedTx);

  // Submit the signed transaction to the blockchain
  const txHash = await wallet.submitTx(signedTx);

  //
  console.log(`Rules deployed Tx ID: ${txHash}`);
 



}

// Execute the function
main()