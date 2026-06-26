/**
 * Handler implementations for deBridge MCP tools.
 *
 * This server intentionally returns unsigned transaction payloads only. It does
 * not own keys, derive wallets, or submit transactions.
 */

import { createPublicClient, getAddress, http } from "viem";
import {
  DLN_API_BASE_URL,
  DLN_STATS_API_BASE_URL,
  ERC20_ABI,
  EVM_NATIVE_TOKEN,
} from "../lib/constants.js";
import {
  CreateTxWithReferralParams,
  GetOrdersByReferralCodeParams,
  SearchTokenParams,
  SourcePreflightParams,
  SupportedChainsInfoResponse,
  createTxWithReferralSchema,
  getOrdersByReferralCodeSchema,
  searchTokenSchema,
  sourcePreflightSchema,
} from "./schemas.js";

interface TokenInfo {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

interface DlnCreateTxResponse {
  tx?: {
    to?: string;
    data?: string;
    value?: string | number;
    [key: string]: unknown;
  };
  orderId?: string;
  order?: {
    orderId?: string;
    [key: string]: unknown;
  };
  estimation?: {
    srcChainTokenIn?: {
      amount?: string;
      [key: string]: unknown;
    };
    dstChainTokenOut?: {
      amount?: string;
      recommendedAmount?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PreflightBalances {
  nativeBalance: string;
  tokenBalance?: string;
  tokenAllowance?: string;
}

export interface PreflightAssessment {
  chainId: string;
  ownerAddress: string;
  tokenAddress: string;
  spenderAddress: string;
  requiredTokenAmount: string;
  txValue: string;
  nativeBalance: string;
  tokenBalance?: string;
  tokenAllowance?: string;
  hasNativeForTxValue: boolean;
  hasTokenBalance: boolean;
  hasTokenAllowance: boolean;
  missingNativeForTxValue: string;
  missingTokenBalance: string;
  missingTokenAllowance: string;
  ready: boolean;
}

export function requireReferralCode(referralCode?: string): string {
  const resolved = referralCode?.trim() || process.env.DEBRIDGE_REFERRAL_CODE?.trim();

  if (!resolved) {
    throw new Error(
      "referralCode is required unless DEBRIDGE_REFERRAL_CODE is configured"
    );
  }

  return resolved;
}

function dlnUrl(path: string): string {
  return `${DLN_API_BASE_URL}${path}`;
}

function statsUrl(path: string): string {
  return `${DLN_STATS_API_BASE_URL}${path}`;
}

function appendIfDefined(params: URLSearchParams, key: string, value: unknown) {
  if (value !== undefined && value !== null && value !== "") {
    params.append(key, String(value));
  }
}

function isNativeToken(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === EVM_NATIVE_TOKEN.toLowerCase();
}

function normalizeAmount(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return Math.trunc(value).toString();
  if (typeof value === "string" && value.length > 0) return value;
  return "0";
}

export function buildCreateTxQuery(
  params: CreateTxWithReferralParams,
  referralCode: string
): URLSearchParams {
  const query = new URLSearchParams();
  query.append("srcChainId", params.srcChainId);
  query.append("srcChainTokenIn", params.srcChainTokenIn);
  query.append("srcChainTokenInAmount", params.srcChainTokenInAmount);
  query.append("dstChainId", params.dstChainId);
  query.append("dstChainTokenOut", params.dstChainTokenOut);
  query.append("dstChainTokenOutAmount", params.dstChainTokenOutAmount);
  query.append("dstChainTokenOutRecipient", params.dstChainTokenOutRecipient);
  query.append("senderAddress", params.senderAddress);
  query.append(
    "srcChainOrderAuthorityAddress",
    params.srcChainOrderAuthorityAddress || params.senderAddress
  );
  query.append("srcChainRefundAddress", params.srcChainRefundAddress || params.senderAddress);
  query.append(
    "dstChainOrderAuthorityAddress",
    params.dstChainOrderAuthorityAddress || params.dstChainTokenOutRecipient
  );
  query.append("referralCode", referralCode);
  query.append("prependOperatingExpenses", String(params.prependOperatingExpenses));

  appendIfDefined(query, "slippage", params.slippage);
  appendIfDefined(query, "additionalTakerRewardBps", params.additionalTakerRewardBps);
  appendIfDefined(query, "deBridgeApp", params.deBridgeApp);

  return query;
}

export function normalizeCreateTxResponse(
  data: DlnCreateTxResponse,
  referralCode: string,
  request: Record<string, string>
) {
  const tx = data.tx ?? {};
  const spenderAddress = tx.to;
  const txValue = normalizeAmount(tx.value);
  const sourceTokenRequiredAmount =
    data.estimation?.srcChainTokenIn?.amount || request.srcChainTokenInAmount;
  const destinationTokenEstimatedAmount =
    data.estimation?.dstChainTokenOut?.recommendedAmount ||
    data.estimation?.dstChainTokenOut?.amount;

  return {
    referralCode,
    orderId: data.orderId || data.order?.orderId,
    spenderAddress,
    sourceTokenRequiredAmount,
    destinationTokenEstimatedAmount,
    txValue,
    tx,
    unsignedTx: tx,
    quote: data.estimation || null,
    request,
    raw: data,
  };
}

export function resolveRpcUrl(chainId: string, rpcUrl?: string): string {
  const resolved =
    rpcUrl ||
    process.env[`DEBRIDGE_RPC_URL_${chainId}`] ||
    process.env[`EVM_RPC_URL_${chainId}`] ||
    process.env[`CHAIN_${chainId}_RPC_URL`] ||
    process.env[`RPC_URL_${chainId}`] ||
    process.env.DEBRIDGE_RPC_URL ||
    process.env.EVM_RPC_URL;

  if (!resolved) {
    throw new Error(
      `Missing RPC URL for chain ${chainId}; set DEBRIDGE_RPC_URL_${chainId}, EVM_RPC_URL_${chainId}, or pass rpcUrl`
    );
  }

  return resolved;
}

export function assessPreflight(
  params: SourcePreflightParams,
  balances: PreflightBalances
): PreflightAssessment {
  const requiredTokenAmount = BigInt(params.tokenAmount);
  const txValue = BigInt(params.txValue);
  const nativeBalance = BigInt(balances.nativeBalance);
  const tokenBalance = balances.tokenBalance ? BigInt(balances.tokenBalance) : undefined;
  const tokenAllowance = balances.tokenAllowance
    ? BigInt(balances.tokenAllowance)
    : undefined;
  const nativeToken = isNativeToken(params.tokenAddress);

  const hasNativeForTxValue = nativeBalance >= txValue;
  const hasTokenBalance = nativeToken
    ? nativeBalance >= requiredTokenAmount + txValue
    : (tokenBalance ?? 0n) >= requiredTokenAmount;
  const hasTokenAllowance = nativeToken
    ? true
    : (tokenAllowance ?? 0n) >= requiredTokenAmount;

  const missingNativeForTxValue =
    nativeBalance >= txValue ? "0" : (txValue - nativeBalance).toString();
  const missingTokenBalance = hasTokenBalance
    ? "0"
    : nativeToken
      ? (requiredTokenAmount + txValue - nativeBalance).toString()
      : (requiredTokenAmount - (tokenBalance ?? 0n)).toString();
  const missingTokenAllowance = hasTokenAllowance
    ? "0"
    : (requiredTokenAmount - (tokenAllowance ?? 0n)).toString();

  return {
    chainId: params.chainId,
    ownerAddress: getAddress(params.ownerAddress),
    tokenAddress: getAddress(params.tokenAddress),
    spenderAddress: getAddress(params.spenderAddress),
    requiredTokenAmount: requiredTokenAmount.toString(),
    txValue: txValue.toString(),
    nativeBalance: nativeBalance.toString(),
    tokenBalance: tokenBalance?.toString(),
    tokenAllowance: tokenAllowance?.toString(),
    hasNativeForTxValue,
    hasTokenBalance,
    hasTokenAllowance,
    missingNativeForTxValue,
    missingTokenBalance,
    missingTokenAllowance,
    ready: hasNativeForTxValue && hasTokenBalance && hasTokenAllowance,
  };
}

export async function searchTokenHandler(args: unknown) {
  const params = searchTokenSchema.parse(args ?? {});
  const url = dlnUrl(`/token-list?chainId=${encodeURIComponent(params.chainId)}`);

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DLN token-list failed: ${response.status} ${text}`);
  }

  const responseData = await response.json();
  const data = responseData.tokens;

  if (!params.search) {
    return { tokens: data };
  }

  const searchTerm = params.search.toLowerCase();
  const tokens = Object.entries(data as Record<string, TokenInfo>)
    .filter(
      ([, token]: [string, TokenInfo]) =>
        token.symbol && token.symbol.toLowerCase().includes(searchTerm)
    )
    .reduce(
      (acc, [address, token]: [string, TokenInfo]) => {
        acc[address] = {
          name: token.name,
          symbol: token.symbol,
          address,
          decimals: token.decimals,
        };
        return acc;
      },
      {} as Record<string, TokenInfo>
    );

  return { tokens };
}

export async function getSupportedChainsHandler(): Promise<SupportedChainsInfoResponse> {
  const response = await fetch(dlnUrl("/supported-chains-info"));
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DLN supported-chains-info failed: ${response.status} ${text}`);
  }

  return (await response.json()) as SupportedChainsInfoResponse;
}

export async function createTxWithReferralHandler(args: unknown) {
  const params = createTxWithReferralSchema.parse(args ?? {});
  const referralCode = requireReferralCode(params.referralCode);
  const query = buildCreateTxQuery(params, referralCode);
  const request = Object.fromEntries(query.entries());
  const response = await fetch(dlnUrl(`/dln/order/create-tx?${query}`));

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DLN create-tx failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as DlnCreateTxResponse;
  if (data.error) {
    throw new Error(String(data.error));
  }

  return normalizeCreateTxResponse(data, referralCode, request);
}

export async function preflightSourceTxHandler(args: unknown) {
  const params = sourcePreflightSchema.parse(args ?? {});
  const rpcUrl = resolveRpcUrl(params.chainId, params.rpcUrl);
  const client = createPublicClient({
    chain: {
      id: Number(params.chainId),
      name: `eip155:${params.chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(rpcUrl),
  });

  const owner = getAddress(params.ownerAddress);
  const nativeBalance = await client.getBalance({ address: owner });
  const balances: PreflightBalances = {
    nativeBalance: nativeBalance.toString(),
  };

  if (!isNativeToken(params.tokenAddress)) {
    const token = getAddress(params.tokenAddress);
    const spender = getAddress(params.spenderAddress);
    const [tokenBalance, tokenAllowance] = await Promise.all([
      client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [owner],
      }),
      client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [owner, spender],
      }),
    ]);

    balances.tokenBalance = tokenBalance.toString();
    balances.tokenAllowance = tokenAllowance.toString();
  }

  return {
    rpcUrl,
    ...assessPreflight(params, balances),
  };
}

export async function getOrdersByReferralCodeHandler(args: unknown) {
  const params = getOrdersByReferralCodeSchema.parse(args ?? {});
  const referralCode = requireReferralCode(params.referralCode);
  const body = {
    giveChainIds: params.giveChainIds,
    orderStates: params.orderStates,
    externalCallStates: params.externalCallStates,
    skip: params.skip,
    take: params.take,
    referralCode,
    ...(params.blockTimestampFrom
      ? { blockTimestampFrom: params.blockTimestampFrom }
      : {}),
  };

  const response = await fetch(statsUrl("/Orders/filteredList"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DLN referral order lookup failed: ${response.status} ${text}`);
  }

  return {
    referralCode,
    request: body,
    result: await response.json(),
  };
}
