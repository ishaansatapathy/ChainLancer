// Initial configuration — will be populated with deployed address
export const ESCROW_CONTRACT_ADDRESS =
  (typeof process !== 'undefined' && process?.env?.ESCROW_CONTRACT_ADDRESS) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ESCROW_CONTRACT_ADDRESS) ||
  '0x71bE63f3384f5fb98995451ddAedB0C7828e33e8';
export const USDC_AMOY_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGONSCAN_BASE_URL = 'https://amoy.polygonscan.com';
