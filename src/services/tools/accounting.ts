import { ITableStorage } from "../../domain/tableStorage.js";
import * as z from "zod";
import { OnchainActionsClient } from "../../entities/onchain-actions-client.js";
import { IWallet } from "../../domain/wallet.js";

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
  ) {}

  /**
   * @returns The current USD price of the wallet.
   */
  private async getCurrentWalletPrice(): Promise<number> {
    const assets = await this.onchainActionsClient.getUserBalances(
      await this.wallet.getAddress(),
    );
    return assets.balances.reduce((total, asset) => total + asset.valueUsd, 0);
  }

  /**
   * Executes the accounting tool to log the current wallet USD price.
   */
  public async execute(): Promise<void> {
    const usdPrice = await this.getCurrentWalletPrice();
    const row: AccountingRow = {
      timestamp: new Date().toISOString(),
      usdPrice,
    };
    await this.accountingStorage.addRow(row);
  }
}
