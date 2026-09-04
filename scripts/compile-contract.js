import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const contractPath = path.join(root, 'contracts', 'ChainLancerEscrow.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'ChainLancerEscrow.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

console.log('Compiling ChainLancerEscrow.sol with solc...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  output.errors.forEach((err) => {
    if (err.severity === 'error') {
      hasError = true;
      console.error(err.formattedMessage);
    } else {
      console.warn(err.formattedMessage);
    }
  });
  if (hasError) {
    process.exit(1);
  }
}

const contract = output.contracts['ChainLancerEscrow.sol']['ChainLancerEscrow'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const outDir = path.join(root, 'contracts', 'artifacts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'ChainLancerEscrow.json'),
  JSON.stringify({ abi, bytecode }, null, 2)
);

// Also generate frontend-ready JS file
const frontendArtifact = `// Auto-generated ABI and configuration for Polygon Amoy
export const ESCROW_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_CHAIN_ID_HEX = '0x13882';
export const USDC_AMOY = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582';
export const POLYGONSCAN_AMOY_URL = 'https://amoy.polygonscan.com';
`;

fs.writeFileSync(
  path.join(root, 'src', 'lib', 'escrowArtifact.js'),
  frontendArtifact.replace(' as const', '')
);

console.log('✓ Compilation successful!');
console.log('  Artifact written to: contracts/artifacts/ChainLancerEscrow.json');
console.log('  Frontend artifact: src/lib/escrowArtifact.js');
console.log('  Bytecode length:', bytecode.length);
