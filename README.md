# deBridge MCP

A focused MCP server for creating referral-attributed deBridge DLN transaction
payloads and validating source-wallet readiness before an external agent wallet
submits the transaction.

This server does not manage private keys, derive wallets, sign transactions, or
send transactions.

## Scope

This MCP is a transaction builder and preflight checker. It is intentionally not
a wallet runtime.

It does:

- resolve deBridge-supported chains and tokens
- create unsigned DLN `create-tx` payloads with a required `referralCode`
- check source-chain native balance, ERC-20 balance, and ERC-20 allowance over
  a caller-provided eRPC/RPC endpoint
- look up orders attributed to a referral code

It does not:

- read `SEED_PHRASE`
- derive wallets from mnemonics
- hold private keys
- sign transactions
- submit transactions
- approve ERC-20 spend
- include Solana signing dependencies

The caller is responsible for taking the returned unsigned transaction and
passing it to the real agent wallet or remote signer after `preflight_source_tx`
returns `ready: true`.

## Tools

1. `get_supported_chains`
   - Reads the current DLN supported-chain list.
2. `search_token`
   - Searches DLN token metadata for a chain.
3. `create_tx_with_referral`
   - Calls DLN `create-tx` directly and always includes a referral code.
   - Returns the unsigned transaction, order id, quote, spender address,
     required source amount, and native tx value.
4. `preflight_source_tx`
   - Uses a provided eRPC/RPC endpoint to check source native balance, ERC-20
     balance, and ERC-20 allowance.
5. `get_orders_by_referral_code`
   - Calls the DLN stats API with the same `referralCode` shape used by the
     deBridge referral-code examples.

## Configuration

```bash
pnpm install
pnpm build
pnpm start
```

Environment variables:

```bash
# Optional if every create/lookup call passes referralCode explicitly.
DEBRIDGE_REFERRAL_CODE=30830

# Optional; defaults to https://dln.debridge.finance/v1.0
DLN_API_BASE_URL=https://dln.debridge.finance/v1.0

# Optional; defaults to https://stats-api.dln.trade/api
DLN_STATS_API_BASE_URL=https://stats-api.dln.trade/api

# Optional eRPC/RPC defaults for preflight_source_tx.
DEBRIDGE_RPC_URL_8453=https://your-erpc-base-mainnet-endpoint
EVM_RPC_URL_1=https://your-erpc-ethereum-mainnet-endpoint
```

There is no `SEED_PHRASE` configuration. If a deployment requires a signer, run
that signer outside this MCP and feed it the unsigned tx returned by
`create_tx_with_referral`.

`preflight_source_tx` also accepts `rpcUrl` per call. That is the preferred
path when the caller has an agent-scoped eRPC endpoint and does not want to
store it in the MCP process environment.

## Intended Flow

1. Call `get_supported_chains` and `search_token` to resolve the route assets.
2. Call `create_tx_with_referral` with the route, source wallet, destination
   recipient, and referral code.
3. Call `preflight_source_tx` with the returned `spenderAddress`,
   `sourceTokenRequiredAmount`, and `txValue`.
4. If preflight is ready, pass `unsignedTx` to the external wallet/signer.
5. Use `get_orders_by_referral_code` to monitor referral-attributed activity.

## Base USDC to Ethereum OBOL

Create an unsigned DLN transaction with referral attribution:

Replace the placeholder addresses with the agent wallet that will submit the
source transaction and receive the destination asset.

```json
{
  "name": "create_tx_with_referral",
  "arguments": {
    "srcChainId": "8453",
    "srcChainTokenIn": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "srcChainTokenInAmount": "1000000",
    "dstChainId": "1",
    "dstChainTokenOut": "0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7",
    "dstChainTokenOutRecipient": "<destination-wallet-address>",
    "senderAddress": "<source-wallet-address>",
    "referralCode": "30830"
  }
}
```

Then preflight the source wallet before handing the unsigned tx to the external
agent wallet:

```json
{
  "name": "preflight_source_tx",
  "arguments": {
    "chainId": "8453",
    "ownerAddress": "<source-wallet-address>",
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "tokenAmount": "1673317",
    "spenderAddress": "0xeF4fB24aD0916217251F553c0596F8Edc630EB66",
    "txValue": "1000000000000000",
    "rpcUrl": "https://your-erpc-base-mainnet-endpoint"
  }
}
```

The returned `ready` flag is true only when native balance, token balance, and
token allowance cover the source transaction requirements.

If `hasTokenAllowance` is false, the caller must perform an ERC-20 approval
outside this MCP before submitting the DLN transaction.

## Referral Tracking

```json
{
  "name": "get_orders_by_referral_code",
  "arguments": {
    "referralCode": "30830",
    "take": 20,
    "blockTimestampFrom": 1758806388
  }
}
```

## Development

```bash
pnpm test
```

The test suite mocks network calls and verifies that referral codes are present
in DLN create-tx URLs and stats API request bodies.
