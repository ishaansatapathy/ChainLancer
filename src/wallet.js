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
} from './lib/amoy.js';

const errorEl = document.getElementById('wallet-error');
const statusEl = document.getElementById('wallet-status');
const addressEl = document.getElementById('wallet-address');
const networkEl = document.getElementById('wallet-network');
const balanceEl = document.getElementById('wallet-balance');
const verifiedEl = document.getElementById('wallet-verified');
const connectBtn = document.getElementById('wallet-connect-btn');
const verifyBtn = document.getElementById('wallet-verify-btn');
const switchBtn = document.getElementById('wallet-switch-btn');
const disconnectBtn = document.getElementById('wallet-disconnect-btn');
const installBtn = document.getElementById('wallet-install-btn');
const actionsEl = document.getElementById('wallet-actions');

const returnParam = new URLSearchParams(window.location.search).get('return');
const continueBtn = document.getElementById('wallet-continue-btn');

let pending = false;
let connectedAddress = null;
let chainId = null;
let backendWallet = null;

function getProvider() {
  return window.ethereum;
}

function hasProvider() {
  return Boolean(getProvider());
}

function showError(msg) {
  if (!msg) {
    errorEl.hidden = true;
    errorEl.textContent = '';
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}

function setPending(isPending) {
  pending = isPending;
  connectBtn.disabled = isPending;
  verifyBtn.disabled = isPending;
  switchBtn.disabled = isPending;
  disconnectBtn.disabled = isPending;
}

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

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function ensureAuth() {
  const me = await api('/api/auth/me').catch(() => null);
  if (!me?.user) {
    window.location.href = `/auth.html?return=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
  return me.user;
}

async function loadBackendWallet() {
  backendWallet = await api('/api/users/me/wallet');
}

function isOnAmoy() {
  return chainId === POLYGON_AMOY_CHAIN_ID;
}

function walletClient() {
  const provider = getProvider();
  if (!provider) return null;
  return createWalletClient({ chain: polygonAmoy, transport: custom(provider) });
}

function publicClient() {
  return createPublicClient({ chain: polygonAmoy, transport: custom(getProvider()) });
}

async function readChainId() {
  const provider = getProvider();
  if (!provider) return null;
  const hex = await provider.request({ method: 'eth_chainId' });
  return Number.parseInt(hex, 16);
}

async function readBalance(address) {
  try {
    const balance = await publicClient().getBalance({ address: getAddress(address) });
    return `${Number(formatEther(balance)).toFixed(4)} POL`;
  } catch {
    return 'Unavailable';
  }
}

async function refreshConnectionState() {
  const provider = getProvider();
  if (!provider) {
    connectedAddress = null;
    chainId = null;
    render();
    return;
  }

  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    connectedAddress = accounts?.[0] && isAddress(accounts[0]) ? getAddress(accounts[0]) : null;
    chainId = await readChainId();
  } catch {
    connectedAddress = null;
    chainId = null;
  }
  render();
}

function render() {
  const connected = Boolean(connectedAddress);
  const onAmoy = isOnAmoy();
  const backendVerified =
    backendWallet?.walletVerified &&
    backendWallet?.walletAddress &&
    connected &&
    backendWallet.walletAddress.toLowerCase() === connectedAddress.toLowerCase();

  installBtn.hidden = hasProvider();
  connectBtn.hidden = connected || !hasProvider();
  disconnectBtn.hidden = !connected;
  switchBtn.hidden = !connected || onAmoy;
  verifyBtn.hidden = !connected || !onAmoy || backendVerified;
  if (continueBtn) {
    continueBtn.hidden = false;
    continueBtn.className = backendVerified ? 'auth-primary wallet-link-btn' : 'auth-google wallet-link-btn';
    continueBtn.textContent = backendVerified ? 'Continue to Profile →' : 'Continue to Profile';
  }

  if (!hasProvider()) {
    statusEl.textContent = 'MetaMask required';
    addressEl.textContent = 'Not connected';
    networkEl.textContent = '—';
    balanceEl.textContent = '—';
    verifiedEl.textContent = 'No';
    return;
  }

  if (!connected) {
    statusEl.textContent = 'Disconnected';
    addressEl.textContent = 'Not connected';
    networkEl.textContent = '—';
    balanceEl.textContent = '—';
    verifiedEl.textContent = backendWallet?.walletVerified ? 'Linked (reconnect to view)' : 'No';
    return;
  }

  addressEl.textContent = shortenAddress(connectedAddress);
  networkEl.textContent = onAmoy ? 'Amoy' : `Chain ${chainId}`;
  verifiedEl.textContent = backendVerified ? 'Yes ✓' : 'No — verification required';

  if (onAmoy) {
    statusEl.textContent = backendVerified ? 'Wallet verified' : 'Connected — verification required';
    readBalance(connectedAddress).then((bal) => {
      if (connectedAddress) balanceEl.textContent = bal;
    });
  } else {
    statusEl.textContent = 'Wrong network';
    balanceEl.textContent = 'Switch to Amoy';
  }

  if (
    connected &&
    backendWallet?.walletVerified &&
    backendWallet.walletAddress.toLowerCase() !== connectedAddress.toLowerCase()
  ) {
    statusEl.textContent = 'Different account selected — verify this wallet to link it';
    verifiedEl.textContent = 'Another wallet is linked to your account';
  }
}

async function connectWallet() {
  if (pending) return;
  showError('');
  if (!hasProvider()) {
    showError('MetaMask is not installed. Please install MetaMask to connect your wallet.');
    return;
  }
  setPending(true);
  try {
    const client = walletClient();
    const [address] = await client.requestAddresses();
    connectedAddress = getAddress(address);
    chainId = await readChainId();
    if (!isOnAmoy()) {
      await switchToAmoy();
      chainId = await readChainId();
    }
    render();
  } catch (err) {
    showError(friendlyError(err));
  } finally {
    setPending(false);
  }
}

async function switchToAmoy() {
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
}

async function verifyOwnership() {
  if (pending || !connectedAddress || !isOnAmoy()) return;
  showError('');
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

    backendWallet = result.wallet;
    render();

    const target = (returnParam && returnParam !== window.location.pathname) ? returnParam : '/profile';
    setTimeout(() => {
      window.location.href = target;
    }, 1200);
  } catch (err) {
    showError(friendlyError(err));
  } finally {
    setPending(false);
  }
}

function disconnectWallet() {
  connectedAddress = null;
  chainId = null;
  showError('');
  render();
}

function bindProviderEvents() {
  const provider = getProvider();
  if (!provider?.on) return;
  provider.on('accountsChanged', (accounts) => {
    connectedAddress = accounts?.[0] && isAddress(accounts[0]) ? getAddress(accounts[0]) : null;
    showError('');
    render();
  });
  provider.on('chainChanged', () => {
    readChainId().then((id) => {
      chainId = id;
      showError('');
      render();
    });
  });
}

connectBtn.addEventListener('click', connectWallet);
verifyBtn.addEventListener('click', verifyOwnership);
switchBtn.addEventListener('click', async () => {
  if (pending) return;
  setPending(true);
  showError('');
  try {
    await switchToAmoy();
    chainId = await readChainId();
    render();
  } catch (err) {
    showError(friendlyError(err));
  } finally {
    setPending(false);
  }
});
disconnectBtn.addEventListener('click', disconnectWallet);
installBtn.addEventListener('click', () => {
  window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
});

async function bootstrap() {
  const user = await ensureAuth();
  if (!user) return;
  await loadBackendWallet();
  bindProviderEvents();
  await refreshConnectionState();
}

bootstrap();
