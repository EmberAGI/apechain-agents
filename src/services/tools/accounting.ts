import { ITableStorage } from "../../domain/tableStorage.js";
import * as z from "zod";
import { OnchainActionsClient } from "../../entities/onchain-actions-client.js";
import { IWallet } from "../../domain/wallet.js";
import { ILogger } from "../../domain/logger.js";

/**
 * Schema for an accounting row.
 */
export const AccountingRowSchema = z.object({
  timestamp: z.iso.datetime(),
  usdPrice: z.number().nonnegative(),
});
export type AccountingRow = z.infer<typeof AccountingRowSchema>;

export class AccountingTool {
  constructor(
    private wallet: IWallet,
    private accountingStorage: ITableStorage<AccountingRow>,
    private onchainActionsClient: OnchainActionsClient,
    private logger: ILogger,
  ) {
    this.logger.info("AccountingTool created");
  }

  /**
   * @returns The current USD price of the wallet.
   */
  private async getCurrentWalletPrice(): Promise<number> {
    try {
      const walletAddress = await this.wallet.getAddress();
      this.logger.debug("Fetching wallet balances for accounting", {
        walletAddress,
      });

      const assets = await this.onchainActionsClient.getUserBalances(
        walletAddress,
      );
      const total = assets.balances.reduce(
        (total, asset) => total + asset.valueUsd,
        0,
      );

      this.logger.debug("Wallet price calculated", {
        walletAddress,
        total,
        assetCount: assets.balances.length,
      });

      return total;
    } catch (error) {
      this.logger.error("Failed to get current wallet price", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to calculate wallet price: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Executes the accounting tool to log the current wallet USD price.
   */
  public async execute(): Promise<void> {
    this.logger.info("Executing accounting tool");
    try {
      const usdPrice = await this.getCurrentWalletPrice();
      this.logger.info("Current wallet price calculated", { usdPrice });

      const row: AccountingRow = {
        timestamp: new Date().toISOString(),
        usdPrice,
      };

      await this.accountingStorage.addRow(row);
      this.logger.debug("Accounting row added to storage", { row });
    } catch (error) {
      this.logger.error("Accounting tool execution failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Accounting tool failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
