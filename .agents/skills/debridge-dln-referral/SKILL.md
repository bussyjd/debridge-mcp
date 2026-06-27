---
name: debridge-dln-referral
description: Work with this repo's deBridge MCP unsigned DLN transaction builder. Use when modifying, testing, or using referral-aware create_tx_with_referral, preflight_source_tx with eRPC/RPC balance and allowance checks, get_orders_by_referral_code, or when verifying that the MCP does not read seed phrases, derive wallets, sign, approve, or submit transactions.
---

# deBridge DLN Referral MCP

Use this skill when working in this repository on the referral-aware deBridge
MCP flow.

## Core Rule

Preserve the trust boundary: this MCP builds unsigned DLN transactions and runs
read-only preflight checks. It must not become a wallet runtime.

Do not add code that:

- reads `SEED_PHRASE`
- derives wallets from mnemonics
- stores or accepts private keys
- signs transactions
- sends transactions
- performs ERC-20 approvals
- reintroduces Solana signing dependencies

## Workflow

1. Inspect the current tool contract in `src/tools/index.ts`,
   `src/tools/schemas.ts`, and `src/tools/handlers.ts`.
2. Keep `referralCode` mandatory through either the tool argument or
   `DEBRIDGE_REFERRAL_CODE`.
3. Keep `create_tx_with_referral` pointed at DLN `create-tx` and make sure the
   outgoing request includes `referralCode`.
4. Keep `preflight_source_tx` read-only: native balance, ERC-20 balance, and
   ERC-20 allowance only.
5. Return unsigned transaction data for an external agent wallet or remote
   signer to handle.
6. Update `README.md` and `tests/handlers.test.mjs` whenever the tool contract
   changes.

Read `references/tool-contract.md` when you need exact tool inputs, output
expectations, environment variables, or validation commands.

## Validation

Run:

```bash
pnpm test
git diff --check
```

Run a safety scan before publishing:

```bash
rg -n "SEED_PHRASE|mnemonic|privateKey|sendTransaction|writeContract|approve|signTransaction|createWalletClient" src tests README.md package.json
```

Expected matches should be limited to documentation or explicit negative
statements. There should be no implementation path that signs, approves, or
submits transactions.
