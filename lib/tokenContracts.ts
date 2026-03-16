// src/lib/tokenContracts.ts

export const TOKEN_CONTRACTS = {
  STX: null, // native token — uses makeSTXTokenTransfer, no contract

  sBTC: {
    mainnet: {
      address: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4",
      name: "sbtc-token",
      tokenDefinedName: "sbtc-token",
    },
    testnet: {
      address: "ST1F1M4YP6WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4",
      name: "sbtc-token",
      tokenDefinedName: "sbtc-token",
    },
  },

  USDCx: {
    mainnet: {
      address: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE",
      name: "usdcx",
      tokenDefinedName: "usdcx",
    },
    testnet: {
      address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      name: "usdcx",
      tokenDefinedName: "usdcx",
    },
  },
} as const;

export type PaymentToken = "STX" | "sBTC" | "USDCx";
