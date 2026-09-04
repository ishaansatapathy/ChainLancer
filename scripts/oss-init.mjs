/**
 * One-time bootstrap: create chainlancer tenant in cloned simple-kyc-oss API.
 * Run after: docker compose -f docker-compose.oss.yml up
 */
const KYC_BASE = process.env.SIMPLE_KYC_BASE_URL || 'http://localhost:8080';
const ADMIN_KEY = process.env.SIMPLE_KYC_ADMIN_KEY || 'chainlancer-admin-key';
const TENANT = process.env.SIMPLE_KYC_TENANT || 'chainlancer';
const REDIRECT = process.env.SIMPLE_KYC_REDIRECT_URI || 'http://localhost:3000/kyc-callback.html';

async function main() {
  const health = await fetch(`${KYC_BASE}/healthz`).catch(() => null);
  if (!health?.ok) {
    console.error(`simple-kyc API not ready at ${KYC_BASE}. Run: docker compose -f docker-compose.oss.yml up`);
    process.exit(1);
  }

  const res = await fetch(`${KYC_BASE}/v1/tenants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': ADMIN_KEY
    },
    body: JSON.stringify({
      slug: TENANT,
      name: 'ChainLancer',
      limit_usdc: 100,
      redirect_uris: `${REDIRECT}\nhttp://localhost:3000/kyc-callback.html`,
      web_origins: 'http://localhost:3000,http://localhost:8081'
    })
  });

  if (res.status === 409 || res.status === 422) {
    console.log(`Tenant "${TENANT}" likely already exists (${res.status})`);
    return;
  }
  if (!res.ok) {
    const text = await res.text();
    console.error(`Tenant create failed: ${res.status} ${text}`);
    process.exit(1);
  }
  console.log(`Tenant "${TENANT}" created. KYC ready at ${KYC_BASE}`);
}

main();
