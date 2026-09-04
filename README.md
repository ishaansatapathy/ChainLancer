# ChainLancer

Cross-border freelance payment platform — Google auth, RBAC, KYC/AML compliance, and MetaMask wallet linking on Polygon Amoy.

**Stack:** Vite (vanilla JS) + embedded Node API middleware + JSON file store

---

## Quick start

```bash
npm install
cp .env.example .env   # add your Google OAuth credentials
npm run dev
```

Open **http://localhost:3000**

> Always use `npm run dev` — do not open HTML files directly or use Live Server.

---

## Pages

| URL | Purpose |
|-----|---------|
| `/` | Landing page |
| `/auth.html` | Login / sign up (Google + email) |
| `/onboarding.html` | Role → country → KYC → wallet |
| `/wallet.html` | MetaMask connect + ownership verification |

---

## Features

- **Auth** — Google OAuth + email/password, JWT cookies
- **RBAC** — `client`, `freelancer`, `arbitrator`, `admin`
- **KYC** — mock or [simple-kyc-oss](https://github.com/p2pdotme/simple-kyc-oss)
- **AML** — mock or [yente](https://github.com/opensanctions/yente) / OpenSanctions
- **Compliance engine** — APPROVED / HOLD / REVIEW / REJECTED
- **Wallet** — real MetaMask on Polygon Amoy (chain ID `80002`), signature verification, POL balance
- **Audit log** — login, role, KYC, AML, wallet events

---

## Environment variables

Copy `.env.example` → `.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api-auth/google/callback
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Demo mode (mock KYC/AML)
DEMO_MODE=true
KYC_PROVIDER=mock
AML_PROVIDER=mock

# Wallet (optional)
VITE_POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
```

Google Cloud redirect URI must be exactly:
`http://localhost:3000/api-auth/google/callback`

---

## Wallet flow

1. Log in → `/wallet.html`
2. Connect MetaMask
3. Switch to **Polygon Amoy** (80002) if prompted
4. **Verify Wallet Ownership** — sign message (no gas)
5. Backend verifies signature and links wallet to your account

Requires MetaMask + Amoy test POL ([faucet](https://faucet.polygon.technology/)).

---

## Real KYC/AML (optional)

```bash
npm run setup:oss      # clone OSS repos into services/
npm run oss:up         # Docker: simple-kyc + yente
npm run oss:init       # create KYC tenant (once)
```

Set in `.env`:
```env
DEMO_MODE=false
KYC_PROVIDER=simple-kyc
AML_PROVIDER=yente
```

---

## API routes

**Auth**
- `GET /api-auth/google` — Google OAuth
- `GET /api/auth/me` — current user
- `POST /api/auth/signup` · `POST /api/auth/signin` · `POST /api/auth/logout`

**Onboarding**
- `GET /api/onboarding/status`
- `POST /api/onboarding/role` · `POST /api/onboarding/country`
- `POST /api/kyc/start` · `GET /api/kyc/status` · `POST /api/kyc/mock/complete`

**Wallet**
- `POST /api/users/me/wallet/challenge`
- `POST /api/users/me/wallet/verify`
- `GET /api/users/me/wallet`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run backend tests |
| `npm run setup:oss` | Clone KYC/AML OSS repos |
| `npm run oss:up` | Start Docker KYC/AML stack |

---

## Project structure

```
├── index.html              Landing page
├── auth.html               Login
├── onboarding.html         Compliance onboarding
├── wallet.html             MetaMask wallet
├── src/                    Frontend JS + CSS
├── server/                 API middleware, services, providers
├── services/               Cloned OSS (simple-kyc-oss, yente) — gitignored
└── docker-compose.oss.yml  Optional KYC/AML services
```

User data stored in `server/data/` (gitignored).

---

## Tests

```bash
npm test
```

Covers RBAC, compliance engine, KYC/AML flow, wallet signature verification.

---

## Hackathon notes

- KYC/AML integrations are **screening layers**, not full regulatory compliance
- Wallet linking uses **message signing only** — no escrow or token transfers yet
- Do not commit `.env` or `server/data/`

---

## License

Private — hackathon MVP.
