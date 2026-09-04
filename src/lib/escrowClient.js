import {
  createWalletClient,
  custom,
  keccak256,
  stringToHex,
  parseUnits,
  formatUnits
} from 'viem';
import { ESCROW_ABI, USDC_AMOY, POLYGON_AMOY_CHAIN_ID } from './escrowArtifact.js';
import { ESCROW_CONTRACT_ADDRESS } from './escrowConfig.js';

// Minimal ERC20 ABI for USDC approve and allowance check
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

export function getProvider() {
  if (typeof window === 'undefined') return null;
  return window.ethereum || null;
}

export function idToBytes32(id) {
  return keccak256(stringToHex(String(id)));
}

/**
 * Approve USDC spending for the escrow contract
 */
export async function approveUsdc(amountInUsdc, account) {
  const provider = getProvider();
  if (!provider) throw new Error('MetaMask not installed');

  const client = createWalletClient({
    transport: custom(provider)
  });

  const parsedAmount = parseUnits(String(amountInUsdc), 6); // USDC uses 6 decimals

  const hash = await client.writeContract({
    address: USDC_AMOY,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [ESCROW_CONTRACT_ADDRESS, parsedAmount],
    account
  });

  return hash;
}

/**
 * Fund the escrow contract for an agreement
 */
export async function fundEscrowOnChain(contractUuid, amountInUsdc, account) {
  const provider = getProvider();
  if (!provider) throw new Error('MetaMask not installed');

  const client = createWalletClient({
    transport: custom(provider)
  });

  const bytes32Id = idToBytes32(contractUuid);
  const parsedAmount = parseUnits(String(amountInUsdc), 6);

  const hash = await client.writeContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'fundEscrow',
    args: [bytes32Id, parsedAmount],
    account
  });

  return hash;
}

/**
 * Release milestone funds on-chain directly to the freelancer
 */
export async function releaseMilestoneOnChain(contractUuid, milestoneIndex, account) {
  const provider = getProvider();
  if (!provider) throw new Error('MetaMask not installed');

  const client = createWalletClient({
    transport: custom(provider)
  });

  const bytes32Id = idToBytes32(contractUuid);

  const hash = await client.writeContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'releaseMilestone',
    args: [bytes32Id, Number(milestoneIndex)],
    account
  });

  return hash;
}
