import { useCallback, useEffect, useState } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  getAddress,
  isAddress
} from 'viem';
import {
  polygonAmoy,
  POLYGON_AMOY_CHAIN_ID,
  POLYGON_AMOY_CHAIN_ID_HEX,
  polygonAmoyAddChainParams,
  shortenAddress
} from '../lib/amoy.js';
import { api } from '../lib/api.js';

function friendlyError(err) {
  const code = err?.code;
  const msg = String(err?.message || err || '');
  if (code === 4001 || /user rejected|denied|cancelled/i.test(msg)) {
    return 'Connection was cancelled in MetaMask.';
  }
  if (/not installed|no ethereum/i.test(msg)) {
    return 'MetaMask is not installed. Please install MetaMask to connect your wallet.';
  }
  return msg.replace(/^Error: /, '') || 'Something went wrong. Please try again.';
}

export function useWallet() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [backendWallet, setBackendWallet] = useState(null);
  const [balance, setBalance] = useState('—');

  const getProvider = () => window.ethereum;
  const hasProvider = () => Boolean(getProvider());
  const isOnAmoy = () => chainId === POLYGON_AMOY_CHAIN_ID;

  const walletClient = useCallback(() => {
    const provider = getProvider();
    if (!provider) return null;
    return createWalletClient({ chain: polygonAmoy, transport: custom(provider) });
  }, []);

  const publicClient = useCallback(() => {
    return createPublicClient({ chain: polygonAmoy, transport: custom(getProvider()) });
  }, []);

  const readChainId = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return null;
    const hex = await provider.request({ method: 'eth_chainId' });
    return Number.parseInt(hex, 16);
  }, []);

  const readBalance = useCallback(async (address) => {
    try {
      const bal = await publicClient().getBalance({ address: getAddress(address) });
      return `${Number(formatEther(bal)).toFixed(4)} POL`;
    } catch {
      return 'Unavailable';
    }
  }, [publicClient]);

  const switchToAmoy = useCallback(async () => {
    const provider = getProvider();
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CHAIN_ID_HEX }]
      });
    } catch (err) {
      if (err?.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [polygonAmoyAddChainParams]
        });
        return;
      }
      throw err;
    }
  }, []);

  const refreshConnectionState = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setConnectedAddress(null);
      setChainId(null);
      return;
    }
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      const addr = accounts?.[0] && isAddress(accounts[0]) ? getAddress(accounts[0]) : null;
      setConnectedAddress(addr);
      setChainId(await readChainId());
    } catch {
      setConnectedAddress(null);
      setChainId(null);
    }
  }, [readChainId]);

  useEffect(() => {
    api('/api/users/me/wallet').then(setBackendWallet).catch(() => {});
    refreshConnectionState();
  }, [refreshConnectionState]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider?.on) return;
    const onAccounts = (accounts) => {
      setConnectedAddress(
        accounts?.[0] && isAddress(accounts[0]) ? getAddress(accounts[0]) : null
      );
      setError('');
    };
    const onChain = () => {
      readChainId().then(setChainId);
      setError('');
    };
    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged', onChain);
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, [readChainId]);

  useEffect(() => {
    if (connectedAddress && isOnAmoy()) {
      readBalance(connectedAddress).then(setBalance);
    } else {
      setBalance('—');
    }
  }, [connectedAddress, chainId, readBalance]);

  const connected = Boolean(connectedAddress);
  const onAmoy = isOnAmoy();
  const backendVerified =
    backendWallet?.walletVerified &&
    backendWallet?.walletAddress &&
    connected &&
    backendWallet.walletAddress.toLowerCase() === connectedAddress?.toLowerCase();

  async function connectWallet() {
    if (pending) return;
    setError('');
    if (!hasProvider()) {
      setError('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      return;
    }
    setPending(true);
    try {
      const client = walletClient();
      const [address] = await client.requestAddresses();
      setConnectedAddress(getAddress(address));
      let id = await readChainId();
      if (id !== POLYGON_AMOY_CHAIN_ID) {
        await switchToAmoy();
        id = await readChainId();
      }
      setChainId(id);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPending(false);
    }
  }

  async function verifyOwnership() {
    if (pending || !connectedAddress || !onAmoy) return null;
    setError('');
    setPending(true);
    try {
      const challenge = await api('/api/users/me/wallet/challenge', {
        method: 'POST',
        body: JSON.stringify({ walletAddress: connectedAddress })
      });
      const client = walletClient();
      const signature = await client.signMessage({
        account: connectedAddress,
        message: challenge.message
      });
      const result = await api('/api/users/me/wallet/verify', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: connectedAddress,
          signature,
          nonce: challenge.nonce
        })
      });
      setBackendWallet(result.wallet);
      return true;
    } catch (err) {
      setError(friendlyError(err));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function switchNetwork() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await switchToAmoy();
      setChainId(await readChainId());
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPending(false);
    }
  }

  function disconnectWallet() {
    setConnectedAddress(null);
    setChainId(null);
    setError('');
  }

  let statusText = 'Disconnected';
  if (!hasProvider()) statusText = 'MetaMask required';
  else if (!connected) statusText = 'Disconnected';
  else if (!onAmoy) statusText = 'Wrong network';
  else if (backendVerified) statusText = 'Wallet verified';
  else statusText = 'Connected — verification required';

  if (
    connected &&
    backendWallet?.walletVerified &&
    backendWallet.walletAddress.toLowerCase() !== connectedAddress?.toLowerCase()
  ) {
    statusText = 'Different account selected — verify this wallet to link it';
  }

  return {
    pending,
    error,
    setError,
    connected,
    onAmoy,
    backendVerified,
    connectedAddress,
    balance,
    statusText,
    addressDisplay: connected ? shortenAddress(connectedAddress) : 'Not connected',
    networkDisplay: connected ? (onAmoy ? 'Amoy' : `Chain ${chainId}`) : '—',
    verifiedDisplay: backendVerified
      ? 'Yes ✓'
      : connected && backendWallet?.walletVerified
        ? 'Another wallet is linked to your account'
        : connected
          ? 'No — verification required'
          : backendWallet?.walletVerified
            ? 'Linked (reconnect to view)'
            : 'No',
    hasProvider: hasProvider(),
    connectWallet,
    verifyOwnership,
    switchNetwork,
    disconnectWallet
  };
}
