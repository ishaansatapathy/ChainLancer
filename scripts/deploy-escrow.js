import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology'
      ]
    }
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' }
  }
});

const USDC_AMOY = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';

async function main() {
  const pkey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pkey) {
    console.error('❌ Error: DEPLOYER_PRIVATE_KEY is missing in .env');
    console.error('Please add your testnet private key to .env:');
    console.error('DEPLOYER_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  const formattedKey = pkey.startsWith('0x') ? pkey : `0x${pkey}`;
  const account = privateKeyToAccount(formattedKey);

  console.log('--- ChainLancer Escrow Deployment ---');
  console.log('Network: Polygon Amoy (80002)');
  console.log('Deployer address:', account.address);
  console.log('USDC Amoy address:', USDC_AMOY);

  const publicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http()
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer POL balance: ${Number(balance) / 1e18} POL`);

  if (balance === 0n) {
    console.error('❌ Insufficient POL for gas fees.');
    console.error('Please request free testnet POL for address:', account.address);
    console.error('Faucet: https://faucet.polygon.technology/ or https://discord.com/invite/0xPolygon');
    process.exit(1);
  }

  const artifactPath = path.join(root, 'contracts', 'artifacts', 'ChainLancerEscrow.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('Artifact not found, compiling first...');
    const { execSync } = await import('child_process');
    execSync('node scripts/compile-contract.js', { stdio: 'inherit' });
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('Deploying ChainLancerEscrow contract...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
    args: [USDC_AMOY, account.address] // Deployer acts as default arbitrator for testnet
  });

  console.log('Deployment tx submitted:', hash);
  console.log('Waiting for block confirmation on Polygon Amoy...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log('✅ ChainLancerEscrow deployed successfully!');
  console.log('Contract Address:', contractAddress);
  console.log(`Explorer: https://amoy.polygonscan.com/address/${contractAddress}`);

  // Save to frontend config
  const configContent = `// Auto-generated deployment config
export const ESCROW_CONTRACT_ADDRESS = '${contractAddress}';
export const USDC_AMOY_ADDRESS = '${USDC_AMOY}';
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGONSCAN_BASE_URL = 'https://amoy.polygonscan.com';
`;

  fs.writeFileSync(
    path.join(root, 'src', 'lib', 'escrowConfig.js'),
    configContent
  );

  // Update .env
  let envContent = fs.readFileSync(path.join(root, '.env'), 'utf8');
  if (envContent.includes('ESCROW_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /ESCROW_CONTRACT_ADDRESS=.*/,
      `ESCROW_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nESCROW_CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  fs.writeFileSync(path.join(root, '.env'), envContent);

  console.log('✓ Configuration updated in src/lib/escrowConfig.js and .env');
}

main().catch((err) => {
  console.error('Deployment error:', err.message);
  process.exit(1);
});
