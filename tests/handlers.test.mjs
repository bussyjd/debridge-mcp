import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPreflight,
  createTxWithReferralHandler,
  getOrdersByReferralCodeHandler,
} from "../dist/tools/handlers.js";

const originalFetch = globalThis.fetch;
const sender = "0x1111111111111111111111111111111111111111";
const spender = "0x2222222222222222222222222222222222222222";
const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ethereumObol = "0x0b010000b7624eb9b3dfbc279673c76e9d29d5f7";

function baseCreateTxArgs(overrides = {}) {
  return {
    srcChainId: "8453",
    srcChainTokenIn: baseUsdc,
    srcChainTokenInAmount: "1000000",
    dstChainId: "1",
    dstChainTokenOut: ethereumObol,
    dstChainTokenOutRecipient: sender,
    senderAddress: sender,
    ...overrides,
  };
}

function mockCreateTxFetch(calls) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        orderId: "0xabc",
        tx: {
          to: spender,
          data: "0x1234",
          value: "1000000000000000",
        },
        estimation: {
          srcChainTokenIn: { amount: "1673317" },
          dstChainTokenOut: { amount: "247000000000000000000" },
        },
      }),
      text: async () => "",
    };
  };
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.DEBRIDGE_REFERRAL_CODE;
});

test("create_tx_with_referral passes explicit referralCode to DLN create-tx", async () => {
  const calls = [];
  mockCreateTxFetch(calls);

  const result = await createTxWithReferralHandler(
    baseCreateTxArgs({ referralCode: "30830" })
  );

  assert.equal(calls.length, 1);
  const requestUrl = new URL(calls[0].url);
  assert.equal(requestUrl.pathname, "/v1.0/dln/order/create-tx");
  assert.equal(requestUrl.searchParams.get("referralCode"), "30830");
  assert.equal(requestUrl.searchParams.get("prependOperatingExpenses"), "true");
  assert.equal(result.referralCode, "30830");
  assert.equal(result.spenderAddress, spender);
  assert.equal(result.sourceTokenRequiredAmount, "1673317");
  assert.equal(result.destinationTokenEstimatedAmount, "247000000000000000000");
  assert.deepEqual(result.unsignedTx, result.tx);
});

test("create_tx_with_referral falls back to DEBRIDGE_REFERRAL_CODE", async () => {
  process.env.DEBRIDGE_REFERRAL_CODE = "4242";
  const calls = [];
  mockCreateTxFetch(calls);

  const result = await createTxWithReferralHandler(baseCreateTxArgs());

  const requestUrl = new URL(calls[0].url);
  assert.equal(requestUrl.searchParams.get("referralCode"), "4242");
  assert.equal(result.referralCode, "4242");
});

test("create_tx_with_referral preserves string false for prependOperatingExpenses", async () => {
  const calls = [];
  mockCreateTxFetch(calls);

  await createTxWithReferralHandler(
    baseCreateTxArgs({
      referralCode: "30830",
      prependOperatingExpenses: "false",
    })
  );

  const requestUrl = new URL(calls[0].url);
  assert.equal(requestUrl.searchParams.get("prependOperatingExpenses"), "false");
});

test("create_tx_with_referral fails when no referralCode is available", async () => {
  await assert.rejects(
    () => createTxWithReferralHandler(baseCreateTxArgs()),
    /referralCode is required/
  );
});

test("get_orders_by_referral_code sends referralCode in stats API request body", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ total: 1, orders: [{ orderId: "0xabc" }] }),
      text: async () => "",
    };
  };

  const result = await getOrdersByReferralCodeHandler({
    referralCode: "30830",
    take: 1,
    blockTimestampFrom: 1758806388,
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://stats-api.dln.trade/api/Orders/filteredList"
  );
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.referralCode, "30830");
  assert.equal(body.take, 1);
  assert.equal(body.blockTimestampFrom, 1758806388);
  assert.equal(result.referralCode, "30830");
});

test("assessPreflight reports missing token balance and allowance", () => {
  const result = assessPreflight(
    {
      chainId: "8453",
      ownerAddress: sender,
      tokenAddress: baseUsdc,
      tokenAmount: "1000",
      spenderAddress: spender,
      txValue: "10",
    },
    {
      nativeBalance: "9",
      tokenBalance: "900",
      tokenAllowance: "250",
    }
  );

  assert.equal(result.ready, false);
  assert.equal(result.hasNativeForTxValue, false);
  assert.equal(result.hasTokenBalance, false);
  assert.equal(result.hasTokenAllowance, false);
  assert.equal(result.missingNativeForTxValue, "1");
  assert.equal(result.missingTokenBalance, "100");
  assert.equal(result.missingTokenAllowance, "750");
});

test("assessPreflight passes when native balance, token balance, and allowance cover requirements", () => {
  const result = assessPreflight(
    {
      chainId: "8453",
      ownerAddress: sender,
      tokenAddress: baseUsdc,
      tokenAmount: "1000",
      spenderAddress: spender,
      txValue: "10",
    },
    {
      nativeBalance: "100",
      tokenBalance: "1000",
      tokenAllowance: "1000",
    }
  );

  assert.equal(result.ready, true);
  assert.equal(result.missingNativeForTxValue, "0");
  assert.equal(result.missingTokenBalance, "0");
  assert.equal(result.missingTokenAllowance, "0");
});
