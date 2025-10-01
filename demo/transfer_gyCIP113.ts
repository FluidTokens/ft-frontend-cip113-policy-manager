import { Asset, conStr0, deserializeAddress, mConStr0,mConStr, mConStr1 } from "@meshsdk/core";
import { getScript, getTxBuilder, wallet,getRuleScript,getCIP113Policy,getSmartReceiver } from "./common";
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

  
  //La policy ora va creata con l'hash del rule script ossia
  console.log(rule_script.policy)

  let tokenName="raulUSDC"
  let tokenNameHex=Buffer.from(tokenName, "utf8").toString("hex")
  let smartToken=getCIP113Policy(tokenNameHex,rule_script.policy)

  console.log("ora quindi la policy del token cip113 sarà")
  console.log(smartToken.policy)

  


  //ora scegliamo un destinatario, sempre Raul e mintiamo 10 token, però dobbiamo mandare i token al suo smart address quindi


  //mandiamo a lore i token anche

  let address_smart=getSmartReceiver(smartToken.scriptCbor,signerHash,false)
  let lore_smart=getSmartReceiver(smartToken.scriptCbor,"00fc7385d20b7992bee4d40c119e06211e79eebe1bb4bf5b04a21b2e",false)

  let quantity_sent="500"
  let quantity_resto="500"

  console.log(address_smart)

  const txBuilder = getTxBuilder();
  await txBuilder
  .spendingPlutusScript("V3") 
    .txIn( // prendo in ingresso 1000 raulUSDC
      "87d3d25aa1181cdac0a29bf66c5ac7cffab5b5090d8f666fe33dc1a7aa722ee2",
      0
    )
    .txInInlineDatumPresent()
    .txInScript(smartToken.scriptCbor)
    .txInRedeemerValue(mConStr0([]))
    .txOut(lore_smart,[{unit:smartToken.policy+tokenNameHex,quantity:quantity_sent}])
    .txOut(address_smart,[{unit:smartToken.policy+tokenNameHex,quantity:quantity_resto}])
    .changeAddress(walletAddress) // Send change back to the wallet address
    .selectUtxosFrom(utxos) // Select UTxOs to use in the transaction
    .requiredSignerHash(signerHash)
    .withdrawalPlutusScriptV3()
    .withdrawal(smartToken.rewardAddress, "0")
    .withdrawalScript(smartToken.scriptCbor)
    .withdrawalRedeemerValue(mConStr0([]))
    .withdrawalPlutusScriptV3()
    .withdrawal(rule_script.rewardAddress, "0")
    .withdrawalScript(rule_script.scriptCbor)
    .withdrawalRedeemerValue(mConStr1([[signerHash],[0],[0]]))
    .txInCollateral(
    "71c0d7b3f9d396ef8edf820d3cf2a96890fe930fead04e5f9c0b3603ac01b4fa",
    0,
    )
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