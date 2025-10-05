import * as z from "zod";
import { TransactionInformationSchema } from "../domain/wallet.js";

export class OnchainActionsClient {
  constructor(private baseUrl: string) {}

  /**
   * Fetch data from a REST API endpoint.
   */
  private async fetchEndpoint<T>(
    endpoint: string,
    resultSchema: z.ZodSchema<T>,
    options?: RequestInit,
  ): Promise<T> {
    const result = await fetch(`${this.baseUrl}/${endpoint}`, options);
    return await resultSchema.parseAsync(await result.json());
  }

  /**
   * Get user balances for a specific wallet address.
   * @param walletAddress The wallet address to fetch balances for.
   * @returns A promise that resolves to the user's balances.
   */
  public async getUserBalances(walletAddress: string): Promise<UserBalance> {
    const endpoint = `/wallet/balances/${walletAddress}`;
    return this.fetchEndpoint(endpoint, UserBalanceSchema);
  }

  /**
   * @param request The swap token request details.
   * @returns A promise that resolves to the swap token response.
   */
  public async createSwap(
    request: SwapTokenRequest,
  ): Promise<SwapTokenResponse> {
    const endpoint = `/swap`;
    return this.fetchEndpoint(endpoint, SwapTokenResponseSchema, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  }
}

/**
 * Schema for identifying a token.
 */
const TokenIdentifier = z.object({
  chainId: z.string(),
  address: z.templateLiteral(["0x", z.string()]),
});
const TokenSchema = z.object({
  tokenUid: TokenIdentifier,
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().nonnegative(),
  isNative: z.boolean(),
  iconUri: z.string().url().nullable(),
  isVetted: z.boolean(),
});

/**
 * Schema for user assets.
 */
const UserAssetSchema = z
  .object({
    decimals: z.number().int().nonnegative(),
    valueUsd: z.number().nonnegative(),
    amount: z.string(),
  })
  .extend(TokenSchema.shape);

/**
 * Schema for user balances.
 */
const UserBalanceSchema = z.object({
  balances: z.array(UserAssetSchema),
});
type UserBalance = z.infer<typeof UserBalanceSchema>;

/**
 * Schema for a swap token request.
 */
const SwapTokenRequestSchema = z.object({
  walletAddress: z.string(),
  amount: z.string(),
  amountType: z.enum(["exactIn", "exactOut"]),
  fromTokenUid: TokenIdentifier,
  toTokenUid: TokenIdentifier,
});
type SwapTokenRequest = z.infer<typeof SwapTokenRequestSchema>;

/**
 * Schema for a swap token response.
 */
const SwapTokenResponseSchema = z.object({
  token: TokenSchema,
  toToken: TokenSchema,
  exactFromAmount: z.string(),
  displayFromAmount: z.string(),
  exactToAmount: z.string(),
  displayToAmount: z.string(),
  transactions: z.array(TransactionInformationSchema),
  estimation: z.object({
    effectivePrice: z.string(),
    timeEstimate: z.string(),
    expiration: z.string(),
  }),
  providerTracking: z.object({
    requestId: z.string(),
    providerName: z.string(),
    explorerUrl: z.string().url(),
  }),
});
type SwapTokenResponse = z.infer<typeof SwapTokenResponseSchema>;
