import { IWallet } from "../domain/wallet.js";
import { IRuntime } from "../domain/runtime.js";
import { AccountingRow, AccountingTool } from "./tools/accounting.js";
import { Environment } from "../entities/environment.js";
import { CsvLocalTableStorage } from "../entities/storage/csv.js";
import { OnchainActionsClient } from "../entities/onchain-actions-client.js";
import { RandomSwappingTradingStrategy } from "./tools/random-swapping.js";

/**
 * Number of milliseconds in one minute.
 */
const ONE_MINUTE_IN_MILLISECONDS = 60 * 1_000;

/**
 * Number of milliseconds in half a minute.
 */
const HALF_MINUTE_IN_MILLISECONDS = 30 * 1_000;

export function setupAgent(
  agentWallet: IWallet,
  vaultWallet: IWallet,
  runtime: IRuntime<unknown>,
  environment: Environment,
  onchainActionsClient: OnchainActionsClient,
) {
  /**
   * Schedule the accounting tool to run every minute.
   */
  const accountingStorage = new CsvLocalTableStorage<AccountingRow>(
    `${environment.settings.MEMORY_FOLDER}/accounting.csv`,
  );
  const accountTool = new AccountingTool(
    vaultWallet,
    accountingStorage,
    onchainActionsClient,
  );
  runtime.scheduleTask(
    accountTool.execute.bind(accountTool),
    ONE_MINUTE_IN_MILLISECONDS,
  );

  /**
   * Schedule the random swapping strategy to run every half minute.
   */
  const randomSwappingStrategy = new RandomSwappingTradingStrategy(
    agentWallet,
    onchainActionsClient,
  );
  runtime.scheduleTask(
    randomSwappingStrategy.execute.bind(randomSwappingStrategy),
    HALF_MINUTE_IN_MILLISECONDS,
  );
}
