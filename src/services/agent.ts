import { IWallet } from "../domain/wallet.js";
import { IRuntime } from "../domain/runtime.js";
import { AccountingRow, AccountingTool } from "./tools/accounting.js";
import { Environment } from "../entities/environment.js";
import { CsvLocalTableStorage } from "../entities/storage/csv.js";
import { OnchainActionsClient } from "../entities/onchain-actions-client.js";
import { RandomSwappingTradingStrategy } from "./tools/random-swapping.js";
import { ILogger } from "../domain/logger.js";

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
  logger: ILogger,
) {
  /**
   * Schedule the accounting tool to run every minute.
   */
  const accountingStorage = new CsvLocalTableStorage<AccountingRow>(
    `${environment.settings.MEMORY_FOLDER}/accounting.csv`,
    ",",
    logger.child({ component: "AccountingStorage" }),
  );
  const accountTool = new AccountingTool(
    vaultWallet,
    accountingStorage,
    onchainActionsClient,
    logger.child({ component: "AccountingTool" }),
  );
  runtime.scheduleTask(
    accountTool.execute.bind(accountTool),
    10_000, //ONE_MINUTE_IN_MILLISECONDS,
  );

  /**
   * Schedule the random swapping strategy to run every half minute.
   */
  const randomSwappingStrategy = new RandomSwappingTradingStrategy(
    agentWallet,
    onchainActionsClient,
    logger.child({ component: "RandomSwappingTradingStrategy" }),
  );
  runtime.scheduleTask(
    randomSwappingStrategy.execute.bind(randomSwappingStrategy),
    15_000, // HALF_MINUTE_IN_MILLISECONDS,
  );
}
