# Tool Contract Reference

Load this reference when changing the MCP tool surface, examples, or tests.

## Tools

`get_supported_chains`

- No arguments.
- Reads `${DLN_API_BASE_URL}/supported-chains-info`.

`search_token`

- Required: `chainId`.
- Optional: `search`.
- Reads `${DLN_API_BASE_URL}/token-list?chainId=...`.

`create_tx_with_referral`

- Builds an unsigned DLN transaction with referral attribution.
- Required:
  - `srcChainId`
  - `srcChainTokenIn`
  - `srcChainTokenInAmount`
  - `dstChainId`
  - `dstChainTokenOut`
  - `dstChainTokenOutRecipient`
  - `senderAddress`
- Optional:
  - `dstChainTokenOutAmount`, default `auto`
  - `srcChainOrderAuthorityAddress`, default `senderAddress`
  - `srcChainRefundAddress`, default `senderAddress`
  - `dstChainOrderAuthorityAddress`, default `dstChainTokenOutRecipient`
  - `referralCode`, or env fallback `DEBRIDGE_REFERRAL_CODE`
  - `slippage`
  - `prependOperatingExpenses`, default `true`
  - `additionalTakerRewardBps`
  - `deBridgeApp`
- Must call `/dln/order/create-tx` with `referralCode` in the query string.
- Returns:
  - `referralCode`
  - `orderId`
  - `spenderAddress`
  - `sourceTokenRequiredAmount`
  - `destinationTokenEstimatedAmount`
  - `txValue`
  - `unsignedTx`
  - `quote`
  - `request`
  - `raw`

`preflight_source_tx`

- Read-only EVM checks.
- Required:
  - `chainId`
  - `ownerAddress`
  - `tokenAddress`
  - `tokenAmount`
  - `spenderAddress`
  - `txValue`
- Optional:
  - `rpcUrl`
- RPC fallback env order:
  - `DEBRIDGE_RPC_URL_<chainId>`
  - `EVM_RPC_URL_<chainId>`
  - `CHAIN_<chainId>_RPC_URL`
  - `RPC_URL_<chainId>`
  - `DEBRIDGE_RPC_URL`
  - `EVM_RPC_URL`
- Returns readiness fields:
  - `ready`
  - `hasNativeForTxValue`
  - `hasTokenBalance`
  - `hasTokenAllowance`
  - `missingNativeForTxValue`
  - `missingTokenBalance`
  - `missingTokenAllowance`

`get_orders_by_referral_code`

- Looks up referral-attributed orders through
  `${DLN_STATS_API_BASE_URL}/Orders/filteredList`.
- Required: `referralCode` or env fallback `DEBRIDGE_REFERRAL_CODE`.
- Optional filters:
  - `giveChainIds`
  - `orderStates`
  - `externalCallStates`
  - `skip`
  - `take`
  - `blockTimestampFrom`

## Environment

Defaults:

```bash
DLN_API_BASE_URL=https://dln.debridge.finance/v1.0
DLN_STATS_API_BASE_URL=https://stats-api.dln.trade/api
```

Optional:

```bash
DEBRIDGE_REFERRAL_CODE=30830
DEBRIDGE_RPC_URL_8453=https://your-erpc-base-mainnet-endpoint
EVM_RPC_URL_1=https://your-erpc-ethereum-mainnet-endpoint
```

There is no `SEED_PHRASE` environment variable.

## Example Route

Base USDC to Ethereum OBOL:

- Base chain id: `8453`
- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Ethereum chain id: `1`
- Ethereum OBOL: `0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7`

Use real agent wallet addresses. Do not use dummy addresses for live DLN quote
smokes because compliance checks may reject them.

## Required Tests

`tests/handlers.test.mjs` should cover:

- explicit `referralCode` is present in DLN `create-tx` URL
- `DEBRIDGE_REFERRAL_CODE` fallback works
- missing referral code fails
- string `"false"` stays false for `prependOperatingExpenses`
- referral tracking POST body includes `referralCode`
- preflight reports missing native/token/allowance correctly
- preflight reports ready when requirements are covered
