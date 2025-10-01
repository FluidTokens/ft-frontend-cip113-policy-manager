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