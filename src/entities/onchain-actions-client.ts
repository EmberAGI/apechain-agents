import * as z from "zod";
import { TransactionInformationSchema } from "../domain/wallet.js";
import { ILogger } from "../domain/logger.js";

export class OnchainActionsClient {
  constructor(private baseUrl: string, private logger: ILogger) {
    this.logger.debug("OnchainActionsClient initialized", { baseUrl });
  }

  /**
   * Fetch data from a REST API endpoint.
   */
  private async fetchEndpoint<T>(
    endpoint: string,
    resultSchema: z.ZodSchema<T>,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    this.logger.debug("Fetching endpoint", {
      url,
      method: options?.method || "GET",
    });

    try {
      const result = await fetch(url, options);

      if (!result.ok) {
        const errorText = await result
          .text()
          .catch(() => "Unable to read error response");
        this.logger.error("API request failed", {
          url,
          status: result.status,
          statusText: result.statusText,
          errorText,
        });
        throw new Error(
          `API request failed: ${result.status} ${result.statusText}. ${errorText}`,
        );
      }

      const jsonData = await result.json();
      this.logger.debug("API response received", {
        url,
        status: result.status,
      });

      try {
        const parsedData = await resultSchema.parseAsync(jsonData);
        this.logger.debug("Response successfully validated", { url });
        return parsedData;
      } catch (validationError) {
        this.logger.error("Response validation failed", {
          url,
          error:
            validationError instanceof Error
              ? validationError.message
              : String(validationError),
          receivedData: jsonData,
        });
        throw new Error(
          `Invalid API response format from ${endpoint}: ${
            validationError instanceof Error
              ? validationError.message
              : String(validationError)
          }`,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("API request failed")
      ) {
        throw error;
      }
      if (
        error instanceof Error &&
        error.message.startsWith("Invalid API response format")
      ) {
        throw error;
      }

      this.logger.error("Network or fetch error", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Network error while fetching ${endpoint}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Get user balances for a specific wallet address.
   * @param walletAddress The wallet address to fetch balances for.
   * @returns A promise that resolves to the user's balances.
   */
  public async getUserBalances(walletAddress: string): Promise<UserBalance> {
    this.logger.debug("Fetching user balances", { walletAddress });
    try {
      const endpoint = `/wallet/balances/${walletAddress}`;
      const result = await this.fetchEndpoint(endpoint, UserBalanceSchema);
      this.logger.debug("User balances fetched", {
        walletAddress,
        balanceCount: result.balances.length,
      });
      return result;
    } catch (error) {
      this.logger.error("Failed to get user balances", {
        walletAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * @param request The swap token request details.
   * @returns A promise that resolves to the swap token response.
   */
  public async createSwap(
    request: SwapTokenRequest,
  ): Promise<SwapTokenResponse> {
    this.logger.debug("Creating swap", {
      fromToken: request.fromTokenUid.address,
      toToken: request.toTokenUid.address,
      amount: request.amount,
      amountType: request.amountType,
    });
    try {
      const endpoint = `/swap`;
      const result = await this.fetchEndpoint(
        endpoint,
        SwapTokenResponseSchema,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        },
      );
      this.logger.debug("Swap created", {
        fromToken: result.token.symbol,
        toToken: result.toToken.symbol,
        fromAmount: result.displayFromAmount,
        toAmount: result.displayToAmount,
        requestId: result.providerTracking.requestId,
      });
      return result;
    } catch (error) {
      this.logger.error("Failed to create swap", {
        request,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
