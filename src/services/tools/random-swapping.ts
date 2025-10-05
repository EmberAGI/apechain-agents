import { IWallet } from "../../domain/wallet.js";
import { arbitrumChain } from "../../entities/chain.js";
import { getRandomBigInt, getRandomElement } from "../../utils/random.js";
import { OnchainActionsClient } from "../../entities/onchain-actions-client.js";
import { ILogger } from "../../domain/logger.js";

// A predefined pool of token addresses to swap between, this are all for arbitrum chain
export const TOKEN_POOL = [
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC
  "0x000000000000000000000000000000000000000000", // ETH
  "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", // WBTC
  "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0", // Uniswap
] as `0x${string}`[];

/**
 * A trading strategy that randomly swaps between tokens in the TOKEN_POOL.
 */
export class RandomSwappingTradingStrategy {
  constructor(
    private wallet: IWallet,
    private onchainActionsClient: OnchainActionsClient,
    private logger: ILogger,
  ) {
    this.logger.info("RandomSwappingTradingStrategy created");
  }

  public async execute(): Promise<void> {
    this.logger.info("Executing random swapping strategy");

    try {
      const walletAddress = await this.wallet.getAddress();
      this.logger.debug("Fetching balances for random swap", { walletAddress });

      const balances = await this.onchainActionsClient.getUserBalances(
        walletAddress,
      );
      const nonZeroBalances = balances.balances.filter(
        (balance) => balance.valueUsd > 0,
      );

      // If there are no non-zero balances, exit early
      if (nonZeroBalances.length === 0) {
        this.logger.warn("No non-zero balances found, skipping swap");
        return;
      }

      // Pick random token from balance
      const fromToken = getRandomElement(nonZeroBalances);
      const fromAmount = getRandomBigInt(1n, BigInt(fromToken.amount));
      const toTokenAddress = getRandomElement(
        TOKEN_POOL.filter((address) => address !== fromToken.tokenUid.address),
      );

      this.logger.info("Creating swap", {
        fromToken: fromToken.tokenUid.address,
        fromTokenSymbol: fromToken.symbol,
        toToken: toTokenAddress,
        amount: fromAmount.toString(),
      });

      const swapResult = await this.onchainActionsClient.createSwap({
        fromTokenUid: {
          chainId: arbitrumChain.chainId,
          address: fromToken.tokenUid.address,
        },
        toTokenUid: {
          chainId: arbitrumChain.chainId,
          address: toTokenAddress,
        },
        amountType: "exactIn",
        amount: fromAmount.toString(),
        walletAddress,
      });

      this.logger.info("Swap created successfully", {
        fromAmount: swapResult.displayFromAmount,
        fromToken: swapResult.token.symbol,
        toAmount: swapResult.displayToAmount,
        toToken: swapResult.toToken.symbol,
        requestId: swapResult.providerTracking.requestId,
      });
    } catch (error) {
      this.logger.error("Random swapping strategy execution failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(
        `Random swapping strategy failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
