
export enum WalletName {

  ETERNL = "eternl",
  GERO = "gero",
  TYPHON = "typhon",
  LACE = "lace",
  YOROI = "yoroi",
  NUFI = "nufi",
  BEGIN = "begin",
  VESPR = "vespr",
  OKX = "okx",
  TOKEO = "tokeo",
  METAMASK = "Metamask",
}

export const WalletIcons: Record<WalletName, string> = {
  [WalletName.ETERNL]: "eternl.png",
  [WalletName.GERO]: "gero.ico",
  [WalletName.TYPHON]: "typhon.png",
  [WalletName.LACE]: "lace.svg",
  [WalletName.YOROI]: "yoroi.png",
  [WalletName.NUFI]: "nufi.png",
  [WalletName.BEGIN]: "begin.png",
  [WalletName.VESPR]: "vespr.jpg",
  [WalletName.OKX]: "okx.png",
  [WalletName.TOKEO]: "tokeo.jpg",
  [WalletName.METAMASK]: "cardano_metamask.svg",
};

export const WALLET_CHROME_EXTENSION_URL: Record<WalletName, string> = {
  [WalletName.ETERNL]: 'https://eternl.io/',
  [WalletName.BEGIN]: 'https://begin.is/',
  [WalletName.GERO]: 'https://www.gerowallet.io/',
  [WalletName.LACE]: 'https://www.lace.io/',
  [WalletName.NUFI]: 'https://nu.fi/',
  [WalletName.TYPHON]: 'https://typhonwallet.io/#/',
  [WalletName.YOROI]: 'https://yoroi-wallet.com/',
  [WalletName.VESPR]: 'https://vespr.xyz/',
  [WalletName.TOKEO]: 'https://tokeopay.io/',
  [WalletName.METAMASK]: 'https://metamask.io/',
  [WalletName.OKX]: 'https://okx.com/',
};


export const WalletList = Object.entries(WalletIcons).map(([key, filename]) => ({
  name: key as WalletName,
  image: `images/logo/wallets/${filename}`,
}));

