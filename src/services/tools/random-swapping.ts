import { IWallet } from "../../domain/wallet.js";
import { arbitrumChain } from "../../entities/chain.js";
import { getRandomBigInt, getRandomElement } from "../../utils/random.js";
import { OnchainActionsClient } from "../../entities/onchain-actions-client.js";

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
  ) {}

  public async execute(): Promise<void> {
    const balances = await this.onchainActionsClient.getUserBalances(
      await this.wallet.getAddress(),
    );
    const nonZeroBalances = balances.balances.filter(
      (balance) => balance.valueUsd > 0,
    );

    // If there are no non-zero balances, exit early
    if (nonZeroBalances.length === 0) {
      return;
    }

    // Pick random token from balance
    const fromToken = getRandomElement(nonZeroBalances);
    const fromAmount = getRandomBigInt(1n, BigInt(fromToken.amount));
    const toTokenAddress = getRandomElement(
      TOKEN_POOL.filter((address) => address !== fromToken.tokenUid.address),
    );
    await this.onchainActionsClient.createSwap({
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
      walletAddress: await this.wallet.getAddress(),
    });
  }
}
