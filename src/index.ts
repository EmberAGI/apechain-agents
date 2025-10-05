import { Environment } from "./entities/environment.js";
import { TSRuntime } from "./entities/runtimes/ts.js";
import { OnchainActionsClient } from "./entities/onchain-actions-client.js";
import { createPublicClient, createWalletClient, http } from "viem";
import { arbitrumChain } from "./entities/chain.js";
import { JSONFileStorage } from "./entities/storage/json.js";
import { LocalFileStorage } from "./entities/storage/local.js";
import { StoredLocalWallet, WalletStorage } from "./services/wallets/local.js";
import { MetaMaskWallet } from "./services/wallets/metamask.js";
import { createBundlerClient } from "viem/account-abstraction";
import { setupAgent } from "./services/agent.js";
import { WinstonLogger } from "./entities/logger/winston.js";

export async function run() {
  const environment = new Environment();

  // Initialize logger
  const logger = new WinstonLogger(environment.settings.LOG_LEVEL);
  logger.info("Starting application");

  /**
   * Create clients for interacting with the blockchain.
   */
  logger.info("Creating blockchain clients");
  const walletClient = createWalletClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.ARBITRUM_RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.ARBITRUM_RPC_URL),
  });
  const bundlerClient = createBundlerClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.BUNDLER_URL),
  });

  /**
   * Vault wallet (stored locally in a file)
   */
  logger.info("Initializing vault wallet");
  const vaultLocalStorage = new LocalFileStorage(
    `${environment.settings.MEMORY_FOLDER}/vault-wallet.json`,
    logger.child({ component: "VaultLocalStorage" }),
  );
  const vaultStoragePath = new JSONFileStorage<WalletStorage>(
    vaultLocalStorage,
    logger.child({ component: "VaultJSONStorage" }),
  );
  const vaultWallet = new StoredLocalWallet(
    vaultStoragePath,
    walletClient,
    logger.child({ component: "VaultWallet" }),
  );

  /**
   * Setup agent and run
   */
  logger.info("Initializing agent wallet");
  const agentWallet = new MetaMaskWallet(
    vaultWallet,
    publicClient,
    bundlerClient,
    logger.child({ component: "AgentWallet" }),
  );

  // Run agent
  logger.info("Starting runtime and agent setup");
  const runtime = new TSRuntime();
  const onchainActions = new OnchainActionsClient(
    environment.settings.ONCHAIN_ACTIONS_API_URL,
    logger.child({ component: "OnchainActionsClient" }),
  );
  setupAgent(
    agentWallet,
    vaultWallet,
    runtime,
    environment,
    onchainActions,
    logger,
  );

  logger.info("Agent setup complete, running till end");
  await runtime.runTillEnd();
}

run();
