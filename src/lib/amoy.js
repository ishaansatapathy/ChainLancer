export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_CHAIN_ID_HEX = '0x13882';

export function getAmoyRpcUrl() {
  return import.meta.env.VITE_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology';
}

export const polygonAmoy = {
  id: POLYGON_AMOY_CHAIN_ID,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: { http: [getAmoyRpcUrl()] }
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' }
  }
};

export const polygonAmoyAddChainParams = {
  chainId: POLYGON_AMOY_CHAIN_ID_HEX,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: [getAmoyRpcUrl()],
  blockExplorerUrls: ['https://amoy.polygonscan.com/']
};

export function shortenAddress(address) {
  if (!address || address.length < 10) return address || 'Not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
